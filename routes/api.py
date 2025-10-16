import os
import base64
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
from services.replicate_service import ReplicateService
from services.nano_service import NanoService
from services.background_removal_service import BackgroundRemovalService

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
        
        # Initialize services
        replicate_service = ReplicateService(current_app.config['REPLICATE_API_TOKEN'])
        background_removal_service = BackgroundRemovalService(current_app.config['REPLICATE_API_TOKEN'])
        nano_service = NanoService(
            current_app.config['AI_INTEGRATIONS_OPENAI_API_KEY'],
            current_app.config['AI_INTEGRATIONS_OPENAI_BASE_URL']
        )
        
        # Check if background removal is requested
        remove_bg = request.form.get('removeBackground', 'false').lower() == 'true'
        
        # Prepare clothing image path (with optional background removal)
        clothing_final_path = clothing_path
        
        # Optional: Remove background from clothing image
        if remove_bg:
            try:
                print("Removing background from clothing image...")
                # Read clothing image as base64 for background removal
                with open(clothing_path, 'rb') as f:
                    clothing_b64 = base64.b64encode(f.read()).decode('utf-8')
                clothing_data_url = f"data:image/png;base64,{clothing_b64}"
                
                bg_removed_url = background_removal_service.remove_background(clothing_data_url)
                if bg_removed_url:
                    # Save background-removed image to new file
                    bg_removed_b64 = bg_removed_url.split(',')[1]
                    bg_removed_bytes = base64.b64decode(bg_removed_b64)
                    
                    bg_removed_filename = f"bg_removed_{clothing_filename}"
                    bg_removed_path = os.path.join(current_app.config['UPLOAD_FOLDER'], bg_removed_filename)
                    
                    with open(bg_removed_path, 'wb') as f:
                        f.write(bg_removed_bytes)
                    
                    clothing_final_path = bg_removed_path
                    print(f"Background removed, saved to {bg_removed_path}")
            except Exception as e:
                print(f"Background removal failed, using original image: {e}")
        
        # Stage 1: Virtual Try-On with Replicate (using file paths)
        try:
            stage1_result = replicate_service.virtual_try_on(user_path, clothing_final_path)
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
