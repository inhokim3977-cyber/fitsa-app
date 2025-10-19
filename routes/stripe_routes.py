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
        
        # Get deployment URL from environment
        domain = os.getenv('PUBLIC_DOMAIN', 'https://virtual-fit.replit.app')
        
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
        
        status = credits_service.get_user_status(ip, user_agent)
        
        return jsonify(status)
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@stripe_bp.route('/simulate-purchase', methods=['POST'])
def simulate_purchase():
    """Testing endpoint to simulate successful credit purchase (bypasses Stripe)"""
    try:
        ip = request.headers.get('X-Forwarded-For', request.remote_addr)
        user_agent = request.headers.get('User-Agent', '')
        user_key = credits_service.get_user_key(ip, user_agent)
        
        # Add credits to user
        credits_service.add_credits(user_key, CREDITS_PER_PURCHASE)
        
        status = credits_service.get_user_status(ip, user_agent)
        
        return jsonify({
            'success': True,
            'credits_added': CREDITS_PER_PURCHASE,
            'new_balance': status
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
