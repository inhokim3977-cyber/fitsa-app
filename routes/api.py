import os
import base64
from flask import Blueprint, request, jsonify, current_app
from werkzeug.utils import secure_filename

api_bp = Blueprint('api', __name__)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'webp'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@api_bp.route('/virtual-fitting', methods=['POST'])
def virtual_fitting():
    """
    Optimized AI pipeline for virtual fashion fitting
    Uses CatVTON-Flux (2024 SOTA) for best clothing/shoes try-on results
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
        
        # Lazy import heavy AI packages (only when endpoint is called)
        from services.replicate_service import ReplicateService
        from services.background_removal_service import BackgroundRemovalService
        
        # Initialize services
        replicate_service = ReplicateService(current_app.config['REPLICATE_API_TOKEN'])
        background_removal_service = BackgroundRemovalService(current_app.config['REPLICATE_API_TOKEN'])
        
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
        
        # Smart Category-Based AI Routing
        stage1_result = None
        method_used = "unknown"
        
        # Support only: upper_body, lower_body, dress
        if category in ['upper_body', 'lower_body', 'dress']:
            
            # 1st Priority: Gemini 2.5 Flash (Best quality, preserves body shape)
            gemini_api_key = current_app.config.get('GEMINI_API_KEY')
            if gemini_api_key:
                print(f"\n=== {category}: Using Gemini 2.5 Flash (quality-first) ===")
                try:
                    # Lazy import Gemini (heavy dependency)
                    from services.gemini_virtual_fitting_service import GeminiVirtualFittingService
                    gemini_service = GeminiVirtualFittingService(gemini_api_key)
                    stage1_result = gemini_service.virtual_try_on(
                        user_photo_bytes,
                        clothing_final_bytes,
                        category=category
                    )
                    if stage1_result:
                        method_used = "Gemini 2.5 Flash Image"
                        print(f"✓ Gemini succeeded for {category}")
                except Exception as e:
                    print(f"✗ Gemini failed: {str(e)}")
            
            # 2nd Priority: IDM-VTON (Fallback)
            if not stage1_result:
                print(f"\n=== Fallback: IDM-VTON for {category} ===")
                replicate_category = 'dresses' if category == 'dress' else category
                try:
                    stage1_result = replicate_service.virtual_try_on(
                        user_photo_bytes, 
                        clothing_final_bytes,
                        category=replicate_category
                    )
                    if stage1_result:
                        method_used = "Replicate IDM-VTON"
                        print(f"✓ IDM-VTON fallback succeeded")
                except Exception as e:
                    print(f"✗ IDM-VTON also failed: {str(e)}")
        else:
            return jsonify({'error': f'Unsupported category: {category}. Only upper_body, lower_body, dress are supported.'}), 400
        
        if not stage1_result:
            return jsonify({'error': f'All virtual fitting methods failed for category: {category}'}), 500
        
        print(f"✓ Virtual fitting completed using: {method_used}")
        
        # No Stage 2 enhancement needed - CatVTON results are already optimal
        final_result = stage1_result
        
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
