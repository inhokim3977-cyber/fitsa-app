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

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=False, use_reloader=False)
