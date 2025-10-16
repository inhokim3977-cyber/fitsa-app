import replicate
import os
from typing import Optional

class BackgroundRemovalService:
    def __init__(self, api_token: str):
        self.api_token = api_token
        os.environ['REPLICATE_API_TOKEN'] = api_token
    
    def remove_background(self, image_url: str) -> Optional[str]:
        """
        Remove background from clothing image using Replicate's BRIA RMBG 2.0 model
        BRIA RMBG 2.0: Faster and better quality than rembg
        
        Args:
            image_url: URL or base64 of the image
        
        Returns:
            URL of the image with background removed
        """
        try:
            # Using BRIA RMBG 2.0 - faster and better quality
            output = replicate.run(
                "briaai/rmbg-2.0:4c9740d407f7675f6b63a02e801c509564c7521bcb2d0c097af3411f114b6498",
                input={
                    "image": image_url
                }
            )
            
            # Handle different output types
            if isinstance(output, str):
                return output
            elif hasattr(output, 'url'):
                # If it's a FileOutput object
                return output.url
            else:
                # Try to convert to string
                return str(output) if output else None
                
        except Exception as e:
            print(f"Background removal error: {str(e)}")
            raise
