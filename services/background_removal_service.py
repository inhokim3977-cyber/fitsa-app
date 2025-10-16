import replicate
import os
from typing import Optional

class BackgroundRemovalService:
    def __init__(self, api_token: str):
        self.api_token = api_token
        os.environ['REPLICATE_API_TOKEN'] = api_token
    
    def remove_background(self, image_url: str) -> Optional[str]:
        """
        Remove background from clothing image using Replicate's rembg model
        
        Args:
            image_url: URL or base64 of the image
        
        Returns:
            URL of the image with background removed
        """
        try:
            output = replicate.run(
                "cjwbw/rembg:fb8af171cfa1616ddcf1242c093f9c46bcada5ad4cf6f2fbe8b81b330ec5c003",
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
