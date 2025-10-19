import os
import stripe
from flask import Blueprint, request, jsonify
from services.credits_service import CreditsService

stripe_bp = Blueprint('stripe', __name__)

# Initialize Stripe
stripe.api_key = os.getenv('STRIPE_SECRET_KEY')

# Credits service
credits_service = CreditsService()

# Stripe Configuration
PRICE_AMOUNT = 200  # $2.00 in cents
CREDITS_PER_PURCHASE = 10
PRODUCT_NAME = "Virtual Try-On Credits"

@stripe_bp.route('/create-checkout-session', methods=['POST'])
def create_checkout_session():
    """Create Stripe Checkout session for credit purchase"""
    try:
        # Get user identification
        ip = request.headers.get('X-Forwarded-For', request.remote_addr)
        user_agent = request.headers.get('User-Agent', '')
        user_key = credits_service.get_user_key(ip, user_agent)
        
        # Get current URL dynamically (works with Replit webview)
        # Use request.url_root which includes the protocol and host
        domain = request.url_root.rstrip('/')  # Remove trailing slash
        
        print(f"[Stripe] Using domain: {domain}")
        
        # Create Stripe Checkout Session
        session = stripe.checkout.Session.create(
            payment_method_types=['card'],
            line_items=[{
                'price_data': {
                    'currency': 'usd',
                    'product_data': {
                        'name': PRODUCT_NAME,
                        'description': f'{CREDITS_PER_PURCHASE} virtual try-on credits',
                    },
                    'unit_amount': PRICE_AMOUNT,
                },
                'quantity': 1,
            }],
            mode='payment',
            success_url=f'{domain}/success?session_id={{CHECKOUT_SESSION_ID}}',
            cancel_url=f'{domain}/',
            client_reference_id=user_key,  # Store user_key for webhook
        )
        
        print(f"[Stripe] Session created: {session.id}")
        print(f"[Stripe] Success URL: {domain}/success")
        print(f"[Stripe] Cancel URL: {domain}/")
        
        return jsonify({
            'sessionId': session.id,
            'url': session.url
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@stripe_bp.route('/webhook', methods=['POST'])
def stripe_webhook():
    """Handle Stripe webhooks (payment completion)"""
    payload = request.data
    sig_header = request.headers.get('Stripe-Signature')
    
    # For testing, if no webhook secret is set, process anyway
    webhook_secret = os.getenv('STRIPE_WEBHOOK_SECRET')
    
    try:
        if webhook_secret:
            event = stripe.Webhook.construct_event(
                payload, sig_header, webhook_secret
            )
        else:
            # For testing without webhook signature verification
            import json
            event = json.loads(payload)
        
        # Handle checkout.session.completed
        if event['type'] == 'checkout.session.completed':
            session = event['data']['object']
            user_key = session.get('client_reference_id')
            
            if user_key:
                # Add credits to user
                credits_service.add_credits(user_key, CREDITS_PER_PURCHASE)
                print(f"✓ Webhook: Added {CREDITS_PER_PURCHASE} credits to user {user_key}")
            else:
                print("✗ Webhook: No user_key in session")
        
        return jsonify({'status': 'success'})
    
    except Exception as e:
        print(f"Webhook error: {str(e)}")
        return jsonify({'error': str(e)}), 400

@stripe_bp.route('/user-status', methods=['GET'])
def get_user_status():
    """Get current user's credit status"""
    try:
        ip = request.headers.get('X-Forwarded-For', request.remote_addr)
        user_agent = request.headers.get('User-Agent', '')
        user_key = credits_service.get_user_key(ip, user_agent)
        
        print(f"[/stripe/user-status] IP: {ip}, UA: {user_agent[:50]}..., user_key: {user_key}")
        
        status = credits_service.get_user_status(ip, user_agent)
        
        print(f"[/stripe/user-status] Returning status: {status}")
        
        return jsonify(status)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@stripe_bp.route('/complete-purchase', methods=['POST'])
def complete_purchase():
    """Complete purchase after Stripe checkout (called from /success page)"""
    try:
        import sqlite3
        
        data = request.get_json()
        session_id = data.get('session_id')
        
        if not session_id:
            return jsonify({'error': 'No session_id provided'}), 400
        
        print(f"[/stripe/complete-purchase] Processing session: {session_id}")
        
        # Retrieve the session from Stripe
        session = stripe.checkout.Session.retrieve(session_id)
        
        print(f"[/stripe/complete-purchase] Payment status: {session.payment_status}")
        
        # Check if payment was successful
        if session.payment_status != 'paid':
            return jsonify({'error': 'Payment not completed'}), 400
        
        # Get user_key from session metadata
        user_key = session.client_reference_id
        
        if not user_key:
            return jsonify({'error': 'No user_key in session'}), 400
        
        print(f"[/stripe/complete-purchase] User key: {user_key}")
        
        # Check if credits were already added for this session
        # (to prevent double-adding if user refreshes /success page)
        conn = sqlite3.connect(credits_service.db_path)
        c = conn.cursor()
        c.execute('SELECT completed_sessions FROM users WHERE user_key = ?', (user_key,))
        result = c.fetchone()
        
        completed_sessions = set()
        if result and result[0]:
            completed_sessions = set(result[0].split(','))
        
        if session_id in completed_sessions:
            print(f"✓ Session {session_id} already processed - skipping credit addition")
            conn.close()
            
            ip = request.headers.get('X-Forwarded-For', request.remote_addr)
            user_agent = request.headers.get('User-Agent', '')
            status = credits_service.get_user_status(ip, user_agent)
            
            return jsonify({
                'success': True,
                'message': '크레딧이 이미 추가되었습니다',
                'credits_added': 0,
                'new_balance': status
            })
        
        # Add credits
        credits_service.add_credits(user_key, CREDITS_PER_PURCHASE)
        
        # Mark session as completed
        completed_sessions.add(session_id)
        c.execute('''
            UPDATE users 
            SET completed_sessions = ? 
            WHERE user_key = ?
        ''', (','.join(completed_sessions), user_key))
        conn.commit()
        conn.close()
        
        print(f"✓ Added {CREDITS_PER_PURCHASE} credits for session {session_id}")
        
        # Get updated status
        ip = request.headers.get('X-Forwarded-For', request.remote_addr)
        user_agent = request.headers.get('User-Agent', '')
        status = credits_service.get_user_status(ip, user_agent)
        
        return jsonify({
            'success': True,
            'message': f'{CREDITS_PER_PURCHASE} 크레딧이 추가되었습니다!',
            'credits_added': CREDITS_PER_PURCHASE,
            'new_balance': status
        })
    
    except Exception as e:
        print(f"❌ Error completing purchase: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@stripe_bp.route('/simulate-purchase', methods=['POST'])
def simulate_purchase():
    """Testing endpoint to simulate successful credit purchase (bypasses Stripe)"""
    try:
        ip = request.headers.get('X-Forwarded-For', request.remote_addr)
        user_agent = request.headers.get('User-Agent', '')
        user_key = credits_service.get_user_key(ip, user_agent)
        
        print(f"[/stripe/simulate-purchase] IP: {ip}, UA: {user_agent[:50]}..., user_key: {user_key}")
        
        # Add credits to user
        credits_service.add_credits(user_key, CREDITS_PER_PURCHASE)
        
        status = credits_service.get_user_status(ip, user_agent)
        
        print(f"[/stripe/simulate-purchase] Added {CREDITS_PER_PURCHASE} credits, new status: {status}")
        
        return jsonify({
            'success': True,
            'credits_added': CREDITS_PER_PURCHASE,
            'new_balance': status
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@stripe_bp.route('/reset-credits', methods=['POST'])
def reset_credits():
    """Testing endpoint to reset user credits to zero (for testing payment flow)"""
    try:
        import sqlite3
        from datetime import datetime
        
        ip = request.headers.get('X-Forwarded-For', request.remote_addr)
        user_agent = request.headers.get('User-Agent', '')
        user_key = credits_service.get_user_key(ip, user_agent)
        
        print(f"[/stripe/reset-credits] Resetting credits for user {user_key}")
        
        # Reset all credits and free tries (INSERT OR REPLACE for new users)
        conn = sqlite3.connect(credits_service.db_path)
        c = conn.cursor()
        
        now = datetime.now().isoformat()
        
        # Use INSERT OR REPLACE to handle both new and existing users
        c.execute("""
            INSERT OR REPLACE INTO users 
            (user_key, free_used_today, credits, last_reset, last_request_hash, refit_count, last_refit_reset)
            VALUES (?, 3, 0, ?, NULL, 0, ?)
        """, (user_key, now, now))
        
        conn.commit()
        conn.close()
        
        status = credits_service.get_user_status(ip, user_agent)
        
        print(f"[/stripe/reset-credits] Reset complete, new status: {status}")
        
        return jsonify({
            'success': True,
            'message': '크레딧이 0으로 리셋되었습니다. (무료 체험 0회)',
            'new_balance': status
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
