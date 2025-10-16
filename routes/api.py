import os
import base64
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
from services.replicate_service import ReplicateService
from services.nano_service import NanoService

api_bp = Blueprint('api', __name__)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@api_bp.route('/virtual-fitting', methods=['POST'])
def virtual_fitting():
    """
    2-stage AI pipeline for virtual fashion fitting
    Stage 1: Replicate Virtual Try-On
    Stage 2: Nano Banana quality enhancement
    """
    try:
        # Check if files are present
        if 'userPhoto' not in request.files or 'clothingPhoto' not in request.files:
            return jsonify({'error': 'Both userPhoto and clothingPhoto are required'}), 400
        
        user_photo = request.files['userPhoto']
        clothing_photo = request.files['clothingPhoto']
        
        if user_photo.filename == '' or clothing_photo.filename == '':
            return jsonify({'error': 'Empty filename'}), 400
        
        if not allowed_file(user_photo.filename) or not allowed_file(clothing_photo.filename):
            return jsonify({'error': 'Invalid file type'}), 400
        
        # Save uploaded files
        user_filename = secure_filename(user_photo.filename or 'user.png')
        clothing_filename = secure_filename(clothing_photo.filename or 'clothing.png')
        
        user_path = os.path.join(current_app.config['UPLOAD_FOLDER'], user_filename)
        clothing_path = os.path.join(current_app.config['UPLOAD_FOLDER'], clothing_filename)
        
        user_photo.save(user_path)
        clothing_photo.save(clothing_path)
        
        # Convert to base64 for API
        with open(user_path, 'rb') as f:
            user_b64 = base64.b64encode(f.read()).decode('utf-8')
        with open(clothing_path, 'rb') as f:
            clothing_b64 = base64.b64encode(f.read()).decode('utf-8')
        
        # Initialize services
        replicate_service = ReplicateService(current_app.config['REPLICATE_API_TOKEN'])
        nano_service = NanoService(
            current_app.config['AI_INTEGRATIONS_OPENAI_API_KEY'],
            current_app.config['AI_INTEGRATIONS_OPENAI_BASE_URL']
        )
        
        # Stage 1: Virtual Try-On with Replicate
        user_data_url = f"data:image/png;base64,{user_b64}"
        clothing_data_url = f"data:image/png;base64,{clothing_b64}"
        
        try:
            stage1_result = replicate_service.virtual_try_on(user_data_url, clothing_data_url)
        except Exception as e:
            return jsonify({'error': f'Stage 1 failed: {str(e)}'}), 500
        
        if not stage1_result:
            return jsonify({'error': 'Failed to generate try-on image'}), 500
        
        # Stage 2: Quality enhancement with Nano Banana
        try:
            stage2_result = nano_service.enhance_quality(stage1_result)
        except Exception as e:
            # If stage 2 fails, return stage 1 result
            print(f"Stage 2 enhancement failed: {e}")
            stage2_result = stage1_result
        
        # Return the final result
        return jsonify({
            'success': True,
            'resultUrl': stage1_result if isinstance(stage2_result, str) and stage2_result.startswith('http') else f"data:image/png;base64,{stage2_result}",
            'stage1_url': stage1_result,
            'status': 'completed'
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})
