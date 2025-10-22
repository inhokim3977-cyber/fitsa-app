import os
import sys
import logging
import requests
from flask import Flask, send_from_directory, Response, g, request
from flask_cors import CORS
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

# Production Logging Setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

app = Flask(__name__, static_folder='static')

# CORS Configuration (프로덕션에서는 allowed_origins 제한 권장)
cors_origins_env = os.getenv('CORS_ORIGINS', '*')
if cors_origins_env == '*':
    # Wildcard - allow all origins
    CORS(app, 
         origins='*',
         methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
         allow_headers=['Content-Type', 'Authorization'])
else:
    # Specific origins (comma-separated)
    allowed_origins = [origin.strip() for origin in cors_origins_env.split(',')]
    CORS(app, 
         origins=allowed_origins,
         methods=['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
         allow_headers=['Content-Type', 'Authorization'])

# Compression (Brotli/gzip) - gunicorn에서 처리
# Security Headers
@app.after_request
def set_security_headers(response):
    """Add security headers to all responses"""
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
    return response

# Request logging
@app.before_request
def log_request():
    """Log incoming requests"""
    g.start_time = datetime.utcnow()
    logger.info(f"→ {request.method} {request.path} from {request.remote_addr}")

@app.after_request
def log_response(response):
    """Log outgoing responses with timing"""
    if hasattr(g, 'start_time'):
        elapsed = (datetime.utcnow() - g.start_time).total_seconds() * 1000
        logger.info(f"← {request.method} {request.path} {response.status_code} ({elapsed:.2f}ms)")
    return response

# Configuration
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['REPLICATE_API_TOKEN'] = os.getenv('REPLICATE_API_TOKEN')
app.config['AI_INTEGRATIONS_OPENAI_API_KEY'] = os.getenv('AI_INTEGRATIONS_OPENAI_API_KEY')
app.config['AI_INTEGRATIONS_OPENAI_BASE_URL'] = os.getenv('AI_INTEGRATIONS_OPENAI_BASE_URL')
app.config['GEMINI_API_KEY'] = os.getenv('GEMINI_API_KEY')

# Create upload folder if it doesn't exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Import and register routes
from routes.api import api_bp
from routes.stripe_routes import stripe_bp
app.register_blueprint(api_bp, url_prefix='/api')
app.register_blueprint(stripe_bp, url_prefix='/stripe')

# Object storage - disabled in Flask-only mode
# Objects should be served directly from GCS or configured separately

# Health check endpoints (for monitoring & Render)
@app.route('/health')
@app.route('/healthz')
def health():
    """
    Health check endpoint for load balancers and monitoring.
    Returns 200 if service is healthy.
    """
    try:
        # Check if critical env vars are set
        required_vars = ['GEMINI_API_KEY', 'STRIPE_SECRET_KEY', 'SESSION_SECRET']
        missing = [var for var in required_vars if not os.getenv(var)]
        
        if missing:
            return {
                'status': 'degraded',
                'missing_env_vars': missing,
                'timestamp': os.popen('date -u +"%Y-%m-%dT%H:%M:%SZ"').read().strip()
            }, 200  # Still return 200 to prevent restart loops
        
        return {
            'status': 'ok',
            'service': 'fitsa-web',
            'timestamp': os.popen('date -u +"%Y-%m-%dT%H:%M:%SZ"').read().strip()
        }, 200
    except Exception as e:
        return {
            'status': 'error',
            'error': str(e),
            'timestamp': os.popen('date -u +"%Y-%m-%dT%H:%M:%SZ"').read().strip()
        }, 500

# Serve frontend
@app.route('/')
def index():
    response = send_from_directory('static', 'index.html')
    response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response

@app.route('/success')
def success():
    return send_from_directory('static', 'success.html')

@app.route('/<path:path>')
def serve_static(path):
    response = send_from_directory('static', path)
    # Add cache control headers for JS files to prevent mobile browser caching
    if path.endswith('.js') or path.endswith('.html'):
        response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
        response.headers['Pragma'] = 'no-cache'
        response.headers['Expires'] = '0'
    return response

# Self Test routes
from flask import render_template_string
from tests import SelfTester

@app.get("/selftest")
def selftest_view():
    html = """
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Self Test</title>
      <style>
        body{font-family:system-ui, -apple-system, Segoe UI, Roboto, sans-serif; padding:20px; line-height:1.4;}
        .btn{display:inline-block;padding:10px 14px;border-radius:10px;background:#111;color:#fff;text-decoration:none}
        .row{border-bottom:1px solid #eee;padding:10px 0}
        .ok{color:#0a0}
        .fail{color:#c00}
        .skip{color:#888}
      </style>
    </head>
    <body>
      <h1>🧪 1단계 완벽코딩 셀프 테스트</h1>
      <p>버튼을 누르면 8가지 항목을 자동 점검합니다. 콘솔 없이 확인할 수 있습니다.</p>
      <p><a class="btn" href="/selftest/run">테스트 실행</a></p>
    </body>
    </html>
    """
    return render_template_string(html)

@app.get("/selftest/run")
def selftest_run():
    st = SelfTester(app)
    report = st.run_all()
    rows = []
    for r in report:
        cls = "ok" if r["result"].startswith("✅") else ("skip" if r["result"].startswith("⏸") else "fail")
        rows.append(f'<div class="row"><b class="{cls}">{r["result"]}</b> — {r["title"]}<br><small>{r["detail"]}</small></div>')
    html = """
    <html><head><meta charset="utf-8"><title>Self Test Result</title>
    <style>body{font-family:system-ui; padding:20px} .row{border-bottom:1px solid #eee;padding:10px 0}
    .ok{color:#0a0}.fail{color:#c00}.skip{color:#888} .btn{padding:8px 12px;border-radius:10px;background:#111;color:#fff;text-decoration:none}
    </style></head><body>
    <h2>결과</h2>""" + "\n".join(rows) + """<p><a class="btn" href="/selftest">돌아가기</a></p></body></html>
    """
    return html

# Error handlers for debugging
@app.errorhandler(500)
def internal_error(error):
    import traceback
    print("="*80)
    print("🚨 INTERNAL SERVER ERROR:")
    print(traceback.format_exc())
    print("="*80)
    return {'error': 'Internal server error', 'message': str(error)}, 500

@app.errorhandler(Exception)
def handle_exception(e):
    import traceback
    print("="*80)
    print("🚨 UNHANDLED EXCEPTION:")
    print(traceback.format_exc())
    print("="*80)
    return {'error': 'Internal server error', 'message': str(e)}, 500

if __name__ == '__main__':
    PORT = int(os.getenv('PORT', '5000'))
    print(f"🚀 Starting Flask on 0.0.0.0:{PORT}")
    app.run(host='0.0.0.0', port=PORT, debug=False, use_reloader=False, threaded=True)
