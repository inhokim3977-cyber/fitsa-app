import replicate
import os
from typing import Optional

class ReplicateService:
    def __init__(self, api_token: str):
        self.api_token = api_token
        os.environ['REPLICATE_API_TOKEN'] = api_token
    
    def virtual_try_on(self, person_image_path: str, clothing_image_path: str, base_url: str) -> Optional[str]:
        """
        Stage 1: Virtual Try-On using Replicate's wolverinn/ecommerce-virtual-try-on model
        
        Args:
            person_image_path: File path to person photo
            clothing_image_path: File path to clothing photo  
            base_url: Base URL of the application for creating public URLs
        
        Returns:
            URL of the try-on result image
        """
        try:
            print(f"Starting Replicate virtual try-on...")
            print(f"Person image: {person_image_path}")
            print(f"Clothing image: {clothing_image_path}")
            
            # Create public URLs that Replicate can access
            person_url = f"{base_url}/{person_image_path}"
            clothing_url = f"{base_url}/{clothing_image_path}"
            
            print(f"Person URL: {person_url}")
            print(f"Clothing URL: {clothing_url}")
            
            print("Calling Replicate API with HTTP URLs...")
            output = replicate.run(
                "wolverinn/ecommerce-virtual-try-on:eb98423e7e49bf03f7ad425bac656405a817f46c56fefe49fc45e9a066b7d0b8",
                input={
                    "face_image": person_url,
                    "commerce_image": clothing_url,
                }
            )
            print("Replicate API call completed!")
            
            # Debug logging
            print(f"Replicate output type: {type(output)}")
            print(f"Replicate output value: {output if isinstance(output, (str, list)) else 'non-serializable'}")
            
            # Handle different output types
            if isinstance(output, str):
                return output
            elif isinstance(output, bytes):
                # If output is bytes, convert to base64 data URL
                import base64
                b64_str = base64.b64encode(output).decode('utf-8')
                return f"data:image/png;base64,{b64_str}"
            elif isinstance(output, list) and len(output) > 0:
                # Get first item from list
                first_item = output[0]
                print(f"First item type: {type(first_item)}")
                
                if isinstance(first_item, bytes):
                    import base64
                    b64_str = base64.b64encode(first_item).decode('utf-8')
                    return f"data:image/png;base64,{b64_str}"
                elif hasattr(first_item, 'url'):
                    return first_item.url
                elif isinstance(first_item, str):
                    return first_item
                else:
                    # Try to read as URL
                    result_str = str(first_item)
                    print(f"Converted to string: {result_str[:100] if len(result_str) > 100 else result_str}")
                    return result_str
            elif hasattr(output, 'url'):
                # If it's a FileOutput object directly
                return output.url
            elif hasattr(output, 'read'):
                # If it's a file-like object
                content = output.read()
                if isinstance(content, bytes):
                    import base64
                    b64_str = base64.b64encode(content).decode('utf-8')
                    return f"data:image/png;base64,{b64_str}"
                return content
            else:
                # Last resort
                print(f"Unknown output type, attempting string conversion")
                return str(output) if output else None
                
        except Exception as e:
            print(f"Replicate error: {str(e)}")
            import traceback
            traceback.print_exc()
            raise
