import os
import base64
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
from services.replicate_service import ReplicateService
from services.nano_service import NanoService
from services.background_removal_service import BackgroundRemovalService
from services.object_storage_service import ObjectStorageService
from services.openai_virtual_fitting_service import OpenAIVirtualFittingService

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
        
        # Read image bytes
        user_photo_bytes = user_photo.read()
        clothing_photo_bytes = clothing_photo.read()
        
        print(f"User photo size: {len(user_photo_bytes)} bytes")
        print(f"Clothing photo size: {len(clothing_photo_bytes)} bytes")
        
        # Initialize services
        replicate_service = ReplicateService(current_app.config['REPLICATE_API_TOKEN'])
        background_removal_service = BackgroundRemovalService(current_app.config['REPLICATE_API_TOKEN'])
        nano_service = NanoService(
            current_app.config['AI_INTEGRATIONS_OPENAI_API_KEY'],
            current_app.config['AI_INTEGRATIONS_OPENAI_BASE_URL']
        )
        openai_fitting_service = OpenAIVirtualFittingService(
            current_app.config['AI_INTEGRATIONS_OPENAI_API_KEY'],
            current_app.config['AI_INTEGRATIONS_OPENAI_BASE_URL']
        )
        
        # Check if background removal is requested
        remove_bg = request.form.get('removeBackground', 'false').lower() == 'true'
        
        # Prepare clothing image bytes (with optional background removal)
        clothing_final_bytes = clothing_photo_bytes
        
        # Optional: Remove background from clothing image
        if remove_bg:
            try:
                print("Removing background from clothing image...")
                clothing_data_url = f"data:image/png;base64,{base64.b64encode(clothing_photo_bytes).decode('utf-8')}"
                
                bg_removed_url = background_removal_service.remove_background(clothing_data_url)
                if bg_removed_url:
                    # Convert data URL back to bytes
                    bg_removed_b64 = bg_removed_url.split(',')[1]
                    clothing_final_bytes = base64.b64decode(bg_removed_b64)
                    print(f"✓ Background removed successfully, new size: {len(clothing_final_bytes)} bytes")
            except Exception as e:
                print(f"✗ Background removal failed, using original image: {e}")
        
        # Determine clothing category (default to upper_body)
        category = request.form.get('category', 'upper_body')
        
        # Stage 1: Virtual Try-On - Try Replicate first, fallback to OpenAI
        stage1_result = None
        method_used = "unknown"
        
        # Try Replicate IDM-VTON first
        print(f"\n=== Attempting Replicate IDM-VTON ===")
        print(f"Category: {category}")
        
        try:
            stage1_result = replicate_service.virtual_try_on(
                user_photo_bytes, 
                clothing_final_bytes,
                category=category
            )
            if stage1_result:
                method_used = "Replicate IDM-VTON"
                print(f"✓ Replicate succeeded: {stage1_result[:100] if isinstance(stage1_result, str) else type(stage1_result)}")
        except Exception as e:
            print(f"✗ Replicate failed: {str(e)}")
            print("Falling back to OpenAI virtual fitting...")
            
            # Fallback to OpenAI
            try:
                stage1_result = openai_fitting_service.virtual_try_on(
                    user_photo_bytes,
                    clothing_final_bytes
                )
                if stage1_result:
                    method_used = "OpenAI DALL-E 3"
                    print(f"✓ OpenAI fallback succeeded: {stage1_result[:100] if isinstance(stage1_result, str) else type(stage1_result)}")
            except Exception as openai_error:
                print(f"✗ OpenAI fallback also failed: {str(openai_error)}")
                import traceback
                traceback.print_exc()
                return jsonify({'error': f'Both Replicate and OpenAI failed. Replicate: {str(e)}, OpenAI: {str(openai_error)}'}), 500
        
        if not stage1_result:
            return jsonify({'error': 'Failed to generate virtual fitting image'}), 500
        
        print(f"✓ Virtual fitting completed using: {method_used}")
        
        # Stage 2: Quality enhancement with Nano Banana (GPT-5-nano)
        final_result = stage1_result
        try:
            print("\n=== Stage 2: Nano Banana Quality Enhancement ===")
            stage2_result = nano_service.enhance_quality(stage1_result)
            if stage2_result:
                final_result = stage2_result
                print(f"✓ Stage 2 enhancement completed")
        except Exception as e:
            print(f"✗ Stage 2 enhancement failed, using Stage 1 result: {e}")
        
        return jsonify({
            'success': True,
            'resultUrl': final_result,
            'stage1_url': stage1_result,
            'method': method_used,
            'status': 'completed'
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@api_bp.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})
