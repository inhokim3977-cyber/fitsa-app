import os
import base64
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename
from services.replicate_service import ReplicateService
from services.nano_service import NanoService
from services.background_removal_service import BackgroundRemovalService
from services.object_storage_service import ObjectStorageService

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
        
        # Initialize Object Storage service
        storage_service = ObjectStorageService()
        
        # Upload user photo to Object Storage
        user_photo_bytes = user_photo.read()
        user_photo_result = storage_service.upload_file(user_photo_bytes, 'png')
        
        if not user_photo_result:
            return jsonify({'error': 'Failed to upload user photo'}), 500
        
        # Upload clothing photo to Object Storage
        clothing_photo_bytes = clothing_photo.read()
        clothing_photo_result = storage_service.upload_file(clothing_photo_bytes, 'png')
        
        if not clothing_photo_result:
            return jsonify({'error': 'Failed to upload clothing photo'}), 500
        
        # Use signed URLs for Replicate API (external access)
        user_photo_signed_url = user_photo_result['signedUrl']
        clothing_photo_signed_url = clothing_photo_result['signedUrl']
        
        print(f"User photo signed URL: {user_photo_signed_url}")
        print(f"Clothing photo signed URL: {clothing_photo_signed_url}")
        
        # Initialize services
        replicate_service = ReplicateService(current_app.config['REPLICATE_API_TOKEN'])
        background_removal_service = BackgroundRemovalService(current_app.config['REPLICATE_API_TOKEN'])
        nano_service = NanoService(
            current_app.config['AI_INTEGRATIONS_OPENAI_API_KEY'],
            current_app.config['AI_INTEGRATIONS_OPENAI_BASE_URL']
        )
        
        # Check if background removal is requested
        remove_bg = request.form.get('removeBackground', 'false').lower() == 'true'
        
        # Prepare clothing image URL (with optional background removal)
        clothing_final_signed_url = clothing_photo_signed_url
        
        # Optional: Remove background from clothing image
        if remove_bg:
            try:
                print("Removing background from clothing image...")
                clothing_data_url = f"data:image/png;base64,{base64.b64encode(clothing_photo_bytes).decode('utf-8')}"
                
                bg_removed_url = background_removal_service.remove_background(clothing_data_url)
                if bg_removed_url:
                    # Upload background-removed image to Object Storage
                    bg_removed_b64 = bg_removed_url.split(',')[1]
                    bg_removed_bytes = base64.b64decode(bg_removed_b64)
                    
                    bg_removed_result = storage_service.upload_file(bg_removed_bytes, 'png')
                    if bg_removed_result:
                        clothing_final_signed_url = bg_removed_result['signedUrl']
                        print(f"Background removed, uploaded with signed URL: {clothing_final_signed_url}")
            except Exception as e:
                print(f"Background removal failed, using original image: {e}")
        
        # Stage 1: Virtual Try-On with Replicate (using signed URLs for external access)
        print(f"About to call Replicate API with signed URLs")
        print(f"User photo signed URL: {user_photo_signed_url[:80]}...")
        print(f"Clothing photo signed URL: {clothing_final_signed_url[:80]}...")
        try:
            stage1_result = replicate_service.virtual_try_on(user_photo_signed_url, clothing_final_signed_url)
            print(f"Replicate API returned: {stage1_result[:100] if isinstance(stage1_result, str) else type(stage1_result)}")
        except Exception as e:
            print(f"Replicate API error: {str(e)}")
            import traceback
            traceback.print_exc()
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
