import requests
import os
from typing import Optional

class ObjectStorageService:
    def __init__(self, node_api_url: str = None):
        self.node_api_url = node_api_url or os.getenv('NODE_API_URL', 'http://127.0.0.1:5001')
    
    def upload_file(self, file_bytes: bytes, file_extension: str = 'png') -> Optional[dict]:
        """
        Upload file to Object Storage via Node.js API
        
        Args:
            file_bytes: File content as bytes
            file_extension: File extension (default: png)
        
        Returns:
            Dict with 'publicUrl' (for browser) and 'signedUrl' (for external APIs)
        """
        try:
            # Call Node.js API to upload file
            response = requests.post(
                f"{self.node_api_url}/api/storage/upload",
                files={'file': (f'image.{file_extension}', file_bytes, f'image/{file_extension}')},
                data={'extension': file_extension}
            )
            
            if response.status_code == 200:
                data = response.json()
                return {
                    'publicUrl': data.get('publicUrl'),
                    'signedUrl': data.get('signedUrl')
                }
            else:
                print(f"Upload failed: {response.status_code} - {response.text}")
                return None
        except Exception as e:
            print(f"Upload error: {e}")
            return None
    
    def get_public_url(self, object_path: str) -> str:
        """Get public URL for an object path"""
        # Object paths are already public URLs in the /objects/ format
        if object_path.startswith('/objects/'):
            return f"{self.node_api_url}{object_path}"
        else:
            return f"{self.node_api_url}/objects/{object_path}"
