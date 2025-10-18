import os
import requests
from flask import Flask, send_from_directory, Response
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__, static_folder='static')
CORS(app)

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
app.register_blueprint(api_bp, url_prefix='/api')

# Proxy /objects/ requests to Node.js server
@app.route('/objects/<path:object_path>')
def serve_object(object_path):
    node_api_url = os.getenv('NODE_API_URL', 'http://127.0.0.1:5001')
    try:
        response = requests.get(f"{node_api_url}/objects/{object_path}", stream=True)
        return Response(
            response.iter_content(chunk_size=8192),
            content_type=response.headers.get('Content-Type', 'image/png'),
            headers={
                'Cache-Control': response.headers.get('Cache-Control', 'public, max-age=31536000')
            }
        )
    except Exception as e:
        print(f"Error proxying object: {e}")
        return "Object not found", 404

# Serve frontend
@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)

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

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=False, use_reloader=False)
