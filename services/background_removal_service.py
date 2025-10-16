import base64
from rembg import remove
from typing import Optional
from io import BytesIO

class BackgroundRemovalService:
    def __init__(self, api_token: str = None):
        # No API token needed for local rembg
        pass
    
    def remove_background(self, image_data_url: str) -> Optional[str]:
        """
        Remove background from clothing image using local rembg library
        Fast local processing (no API calls)
        
        Args:
            image_data_url: Base64 data URL of the image
        
        Returns:
            Base64 data URL of the image with background removed
        """
        try:
            # Extract base64 data from data URL
            if image_data_url.startswith('data:image'):
                # Split "data:image/png;base64,XXXXX"
                base64_data = image_data_url.split(',')[1]
            else:
                base64_data = image_data_url
            
            # Decode base64 to bytes
            input_data = base64.b64decode(base64_data)
            
            # Remove background using local rembg
            print("Removing background locally with rembg...")
            output_data = remove(input_data)
            
            # Encode result back to base64
            output_base64 = base64.b64encode(output_data).decode('utf-8')
            
            # Return as data URL
            return f"data:image/png;base64,{output_base64}"
                
        except Exception as e:
            print(f"Background removal error: {str(e)}")
            raise
