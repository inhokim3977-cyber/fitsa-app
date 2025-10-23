import base64
from typing import Optional
from io import BytesIO
from PIL import Image

try:
    from rembg import remove
    REMBG_AVAILABLE = True
except ImportError:
    REMBG_AVAILABLE = False
    print("Warning: rembg not available. Background removal disabled.")

class BackgroundRemovalService:
    def __init__(self, api_token: str = None):
        # No API token needed for local rembg
        pass
    
    def remove_background(self, image_data_url: str) -> Optional[str]:
        """
        Remove background from clothing image using local rembg library
        Fast local processing with image resizing for speed
        
        Args:
            image_data_url: Base64 data URL of the image
        
        Returns:
            Base64 data URL of the image with background removed
        """
        if not REMBG_AVAILABLE:
            raise ImportError("rembg library not available. Please install it or use without background removal.")
        
        try:
            # Extract base64 data from data URL
            if image_data_url.startswith('data:image'):
                # Split "data:image/png;base64,XXXXX"
                base64_data = image_data_url.split(',')[1]
            else:
                base64_data = image_data_url
            
            # Decode base64 to bytes
            input_data = base64.b64decode(base64_data)
            
            # Open image and resize for faster processing
            img = Image.open(BytesIO(input_data))
            original_size = img.size
            
            # Resize to max 800px on longest side for speed
            max_size = 800
            if max(img.size) > max_size:
                ratio = max_size / max(img.size)
                new_size = (int(img.size[0] * ratio), int(img.size[1] * ratio))
                img = img.resize(new_size, Image.Resampling.LANCZOS)
                print(f"Resized from {original_size} to {img.size} for faster processing")
            
            # Convert to bytes for rembg
            img_byte_arr = BytesIO()
            img.save(img_byte_arr, format='PNG')
            img_bytes = img_byte_arr.getvalue()
            
            # Remove background using local rembg with fast model
            print("Removing background locally with rembg (fast mode)...")
            output_data = remove(
                img_bytes,
                alpha_matting=False,  # Disable for speed
                alpha_matting_foreground_threshold=240,
                alpha_matting_background_threshold=10,
                alpha_matting_erode_size=10
            )
            
            # Resize back to original size
            output_img = Image.open(BytesIO(output_data))
            if output_img.size != original_size:
                output_img = output_img.resize(original_size, Image.Resampling.LANCZOS)
                output_byte_arr = BytesIO()
                output_img.save(output_byte_arr, format='PNG')
                output_data = output_byte_arr.getvalue()
            
            # Encode result back to base64
            output_base64 = base64.b64encode(output_data).decode('utf-8')
            
            # Return as data URL
            return f"data:image/png;base64,{output_base64}"
                
        except Exception as e:
            print(f"Background removal error: {str(e)}")
            raise
