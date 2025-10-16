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
            
            # Handle different output types
            if isinstance(output, str):
                return output
            elif isinstance(output, list) and len(output) > 0:
                # Get first item from list
                first_item = output[0]
                # If it's a FileOutput object, get the URL
                if hasattr(first_item, 'url'):
                    return first_item.url
                elif isinstance(first_item, str):
                    return first_item
                else:
                    return str(first_item)
            elif hasattr(output, 'url'):
                # If it's a FileOutput object directly
                return output.url
            else:
                # Try to convert to string as last resort
                return str(output) if output else None
                
        except Exception as e:
            print(f"Replicate error: {str(e)}")
            raise
