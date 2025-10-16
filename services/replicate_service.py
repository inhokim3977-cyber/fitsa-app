import replicate
import os
from typing import Optional

class ReplicateService:
    def __init__(self, api_token: str):
        self.api_token = api_token
        os.environ['REPLICATE_API_TOKEN'] = api_token
    
    def virtual_try_on(self, person_image_url: str, clothing_image_url: str) -> Optional[str]:
        """
        Stage 1: Virtual Try-On using Replicate's wolverinn/ecommerce-virtual-try-on model
        
        Args:
            person_image_url: URL or base64 of person photo
            clothing_image_url: URL or base64 of clothing photo
        
        Returns:
            URL of the try-on result image
        """
        try:
            output = replicate.run(
                "wolverinn/ecommerce-virtual-try-on:eb98423e7e49bf03f7ad425bac656405a817f46c56fefe49fc45e9a066b7d0b8",
                input={
                    "face_image": person_image_url,
                    "commerce_image": clothing_image_url,
                }
            )
            
            # Output is typically a URL to the generated image
            if isinstance(output, str):
                return output
            elif isinstance(output, list) and len(output) > 0:
                return output[0]
            else:
                return None
                
        except Exception as e:
            print(f"Replicate error: {str(e)}")
            raise
