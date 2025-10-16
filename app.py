import os
from flask import Flask, send_from_directory
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

# Create upload folder if it doesn't exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Import and register routes
from routes.api import api_bp
app.register_blueprint(api_bp, url_prefix='/api')

# Serve frontend
@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('static', path)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False, use_reloader=False)
