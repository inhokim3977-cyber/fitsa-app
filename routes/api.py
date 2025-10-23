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
    With monetization: 3 free tries/day, then paid credits
    """
    # Initialize variables for exception handler
    credits_service = None
    ip = None
    user_agent = None
    info = None
    
    try:
        # Check if files are present (validate first before credit check)
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
        
        # CRITICAL: Validate images BEFORE consuming credits
        try:
            from PIL import Image
            import io
            
            # Test if images can be opened
            user_img = Image.open(io.BytesIO(user_photo_bytes))
            clothing_img = Image.open(io.BytesIO(clothing_photo_bytes))
            
            # Verify images are valid
            user_img.verify()
            clothing_img.verify()
            
            print(f"✓ Image validation passed: user={user_img.format}, clothing={clothing_img.format}")
        except Exception as e:
            print(f"✗ Image validation failed: {str(e)}")
            return jsonify({
                'error': 'Invalid image format',
                'message': '이미지 형식이 올바르지 않습니다. 다른 사진을 시도해주세요.'
            }), 400
        
        # Import credits service
        from services.credits_service import CreditsService
        credits_service = CreditsService()
        
        # Calculate request hash for refitting detection
        request_hash = credits_service.calculate_request_hash(user_photo_bytes, clothing_photo_bytes)
        
        # Check user's credit status with refitting detection
        # Prefer cookie-based user_key for consistency
        user_key = request.cookies.get('user_key')
        
        if user_key:
            # Use cookie user_key directly (bypass IP+UA hashing)
            print(f"[virtual-fitting] Using cookie user_key: {user_key}")
            # We need to pass something to check_and_consume, but we'll modify it to accept user_key
            # For now, let's use a placeholder
            ip = user_key  # Use user_key as "ip" parameter
            user_agent = ''
        else:
            # Fallback to IP + UA
            ip = request.headers.get('X-Forwarded-For', request.remote_addr or '127.0.0.1')
            user_agent = request.headers.get('User-Agent', '')
            print(f"[virtual-fitting] No cookie - using IP+UA: {ip}")
        
        allowed, info = credits_service.check_and_consume(ip, user_agent, request_hash)
        
        if not allowed:
            # Check if it's a refit limit error
            if info.get('refit_limit_exceeded'):
                return jsonify({
                    'error': 'Refit limit exceeded',
                    'refit_limit_exceeded': True,
                    'message': info.get('error', '재피팅 한도 초과: 1시간 내 최대 5회까지 가능합니다.'),
                    'remaining_free': info['remaining_free'],
                    'credits': info['credits']
                }), 429  # Too Many Requests
            
            # User needs to purchase credits
            return jsonify({
                'error': 'No credits remaining',
                'needs_payment': True,
                'message': '무료 체험 3회를 모두 사용하셨습니다. 크레딧을 구매해주세요.',
                'remaining_free': info['remaining_free'],
                'credits': info['credits']
            }), 402  # Payment Required
        
        # Log credit usage
        if info.get('is_refitting'):
            print(f"✓ REFITTING (no charge): remaining_free={info['remaining_free']}, credits={info['credits']}")
        else:
            print(f"✓ Credit consumed ({info['used_type']}): remaining_free={info['remaining_free']}, credits={info['credits']}")
        
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
        
        # Get quality setting (fast or high)
        quality = request.form.get('quality', 'high')
        print(f"Quality mode: {quality}")
        
        # Resize images for fast mode
        if quality == 'fast':
            print("⚡ Fast mode: Resizing images to 600x800...")
            from PIL import Image
            import io
            
            # Resize user photo
            user_img = Image.open(io.BytesIO(user_photo_bytes))
            # Convert RGBA to RGB if necessary
            if user_img.mode in ('RGBA', 'LA', 'P'):
                user_img = user_img.convert('RGB')
            user_img.thumbnail((600, 800), Image.Resampling.LANCZOS)
            user_buffer = io.BytesIO()
            user_img.save(user_buffer, format='JPEG', quality=85)
            user_photo_bytes = user_buffer.getvalue()
            print(f"User photo resized: {len(user_photo_bytes)} bytes")
            
            # Resize clothing photo
            clothing_img = Image.open(io.BytesIO(clothing_final_bytes))
            # Convert RGBA to RGB if necessary
            if clothing_img.mode in ('RGBA', 'LA', 'P'):
                clothing_img = clothing_img.convert('RGB')
            clothing_img.thumbnail((600, 800), Image.Resampling.LANCZOS)
            clothing_buffer = io.BytesIO()
            clothing_img.save(clothing_buffer, format='JPEG', quality=85)
            clothing_final_bytes = clothing_buffer.getvalue()
            print(f"Clothing photo resized: {len(clothing_final_bytes)} bytes")
        
        # Smart Category-Based AI Routing
        stage1_result = None
        method_used = "unknown"
        
        # Support only: upper_body, lower_body, dress
        if category in ['upper_body', 'lower_body', 'dress']:
            
            # 1st Priority: Gemini 2.5 Flash (Best quality, preserves hands/objects)
            gemini_api_key = current_app.config.get('GEMINI_API_KEY')
            if gemini_api_key:
                print(f"\n=== {category}: Using Gemini 2.5 Flash (quality-first) ===")
                try:
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
            # AI generation failed - refund credit
            if not info.get('is_refitting'):
                # Only refund if it was not a refitting (refitting doesn't consume credits)
                credits_service.refund_credit(ip, user_agent, info.get('used_type', 'free'))
                print(f"💔 AI generation failed - credit refunded")
            return jsonify({'error': f'All virtual fitting methods failed for category: {category}'}), 500
        
        print(f"✓ Virtual fitting completed using: {method_used}")
        
        # No Stage 2 enhancement needed - CatVTON results are already optimal
        final_result = stage1_result
        
        return jsonify({
            'success': True,
            'resultUrl': final_result,
            'stage1_url': stage1_result,
            'method': method_used,
            'status': 'completed',
            'credits_info': {
                'remaining_free': info['remaining_free'],
                'credits': info['credits'],
                'is_refitting': info.get('is_refitting', False),
                'refit_count': info.get('refit_count', 0)
            }
        })
    
    except Exception as e:
        # Unexpected error - refund credit
        if credits_service and ip and info and not info.get('is_refitting'):
            credits_service.refund_credit(ip, user_agent or '', info.get('used_type', 'free'))
            print(f"💔 Unexpected error - credit refunded")
        return jsonify({'error': str(e)}), 500

@api_bp.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok'})

# ============================================
# Saved Fits API Endpoints
# ============================================

@api_bp.route('/save-fit', methods=['POST'])
def save_fit():
    """Save a virtual fitting result with shopping information"""
    try:
        from services.saved_fits_service import save_fit as save_fit_service
        
        # Get user_key from cookie
        user_key = request.cookies.get('user_key')
        if not user_key:
            return jsonify({'ok': False, 'error': 'User not identified'}), 401
        
        # Get request data
        data = request.get_json()
        if not data:
            return jsonify({'ok': False, 'error': 'No data provided'}), 400
        
        # Save fit
        result = save_fit_service(user_key, data)
        
        if result['ok']:
            return jsonify(result), 200
        else:
            return jsonify(result), 400
            
    except Exception as e:
        print(f'Error in save_fit endpoint: {e}')
        return jsonify({'ok': False, 'error': str(e)}), 500

@api_bp.route('/saved-fits', methods=['GET'])
def get_saved_fits():
    """Get saved fits for the current user"""
    try:
        from services.saved_fits_service import get_saved_fits as get_fits_service
        
        # Get user_key from cookie
        user_key = request.cookies.get('user_key')
        print(f'[/api/saved-fits] user_key from cookie: {user_key}')
        
        if not user_key:
            print('[/api/saved-fits] No user_key cookie found, returning empty result')
            return jsonify({'items': [], 'total': 0, 'page': 1, 'per_page': 20}), 200
        
        # Get query parameters
        page = int(request.args.get('page', 1))
        per_page = int(request.args.get('per_page', 20))
        query = request.args.get('q')
        
        print(f'[/api/saved-fits] Fetching saved fits: user_key={user_key}, page={page}, per_page={per_page}, query={query}')
        
        # Get saved fits
        result = get_fits_service(user_key, page, per_page, query)
        
        print(f'[/api/saved-fits] Result: total={result.get("total", 0)}, items_count={len(result.get("items", []))}')
        
        return jsonify(result), 200
        
    except Exception as e:
        print(f'Error in get_saved_fits endpoint: {e}')
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@api_bp.route('/saved-fits/<fit_id>', methods=['GET'])
def get_fit_detail(fit_id):
    """Get a single saved fit by ID"""
    try:
        from services.saved_fits_service import get_fit_by_id
        
        # Get user_key from cookie
        user_key = request.cookies.get('user_key')
        if not user_key:
            return jsonify({'error': 'User not identified'}), 401
        
        # Get fit
        fit = get_fit_by_id(user_key, fit_id)
        
        if fit:
            return jsonify(fit), 200
        else:
            return jsonify({'error': 'Fit not found'}), 404
            
    except Exception as e:
        print(f'Error in get_fit_detail endpoint: {e}')
        return jsonify({'error': str(e)}), 500

@api_bp.route('/saved-fits/<fit_id>', methods=['DELETE'])
def delete_saved_fit(fit_id):
    """Delete a saved fit"""
    try:
        from services.saved_fits_service import delete_fit
        
        # Get user_key from cookie
        user_key = request.cookies.get('user_key')
        if not user_key:
            return jsonify({'ok': False, 'error': 'User not identified'}), 401
        
        # Delete fit
        result = delete_fit(user_key, fit_id)
        
        if result['ok']:
            return jsonify(result), 200
        else:
            return jsonify(result), 404
            
    except Exception as e:
        print(f'Error in delete_saved_fit endpoint: {e}')
        return jsonify({'ok': False, 'error': str(e)}), 500

@api_bp.route('/share-reward', methods=['POST'])
def share_reward():
    """
    Track SNS share and reward user with credits
    Rewards +5 credits per share (max 1 reward per day per platform)
    """
    try:
        from services.credits_service import CreditsService
        from datetime import datetime, timedelta
        import sqlite3
        
        # Validate request body
        data = request.get_json()
        if not data:
            return jsonify({
                'success': False,
                'error': 'Invalid request: JSON body required'
            }), 400
        
        # Validate and whitelist platform parameter (SECURITY: prevent credit abuse)
        ALLOWED_PLATFORMS = ['instagram', 'kakao', 'general']
        platform = data.get('platform', '').lower()
        
        if not platform or platform not in ALLOWED_PLATFORMS:
            return jsonify({
                'success': False,
                'error': f'Invalid platform. Allowed: {", ".join(ALLOWED_PLATFORMS)}'
            }), 400
        
        # Get user identification
        user_key = request.cookies.get('user_key')
        
        # Fallback to IP + UA if no cookie
        if not user_key:
            ip = request.headers.get('X-Forwarded-For', request.remote_addr or '127.0.0.1')
            user_agent = request.headers.get('User-Agent', '')
            credits_service = CreditsService()
            user_key = credits_service.get_user_key(ip, user_agent)
        
        # Initialize share tracking DB
        conn = sqlite3.connect('credits.db')
        c = conn.cursor()
        
        # Create share_log table if not exists
        c.execute('''
            CREATE TABLE IF NOT EXISTS share_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_key TEXT NOT NULL,
                platform TEXT NOT NULL,
                shared_at TEXT NOT NULL,
                credits_rewarded INTEGER DEFAULT 5
            )
        ''')
        conn.commit()
        
        # Check if user already shared on this platform today
        today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        c.execute('''
            SELECT COUNT(*) FROM share_log 
            WHERE user_key = ? AND platform = ? AND shared_at >= ?
        ''', (user_key, platform, today_start))
        
        share_count_today = c.fetchone()[0]
        
        if share_count_today > 0:
            conn.close()
            return jsonify({
                'success': False,
                'message': '오늘 이미 이 플랫폼에서 보상을 받으셨습니다',
                'credits_added': 0,
                'already_rewarded': True
            }), 200
        
        # Log the share
        now = datetime.now().isoformat()
        c.execute('''
            INSERT INTO share_log (user_key, platform, shared_at, credits_rewarded)
            VALUES (?, ?, ?, 5)
        ''', (user_key, platform, now))
        conn.commit()
        conn.close()
        
        # Add credits
        credits_service = CreditsService()
        credits_service.add_credits(user_key, 5)
        
        print(f"✅ Share reward: user={user_key}, platform={platform}, +5 credits")
        
        return jsonify({
            'success': True,
            'message': '공유 감사합니다! +5 크레딧이 지급되었습니다',
            'credits_added': 5,
            'platform': platform
        }), 200
        
    except Exception as e:
        print(f'Error in share_reward endpoint: {e}')
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': str(e),
            'message': '공유 보상 처리 중 오류가 발생했습니다'
        }), 500
