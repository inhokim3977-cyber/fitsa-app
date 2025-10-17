import replicate
import os
from typing import Optional

class CatVTONService:
    def __init__(self, api_token: str):
        self.api_token = api_token
        os.environ['REPLICATE_API_TOKEN'] = api_token
    
    def virtual_try_on(self, person_image_bytes: bytes, clothing_image_bytes: bytes, category: str = "upper") -> Optional[str]:
        """
        Virtual Try-On using CatVTON-Flux (Best-in-class 2024 SOTA)
        
        Args:
            person_image_bytes: Person image as bytes
            clothing_image_bytes: Clothing image as bytes
            category: Clothing category - "upper", "lower", "overall" (dress), "shoes"
        
        Returns:
            URL of the try-on result image
        """
        try:
            import base64
            
            print(f"\n=== Starting CatVTON-Flux Virtual Try-On ===")
            print(f"Person image size: {len(person_image_bytes)} bytes ({len(person_image_bytes)/1024:.1f}KB)")
            print(f"Clothing image size: {len(clothing_image_bytes)} bytes ({len(clothing_image_bytes)/1024:.1f}KB)")
            print(f"Category: {category}")
            
            # Convert to base64 data URIs
            person_b64 = base64.b64encode(person_image_bytes).decode('utf-8')
            clothing_b64 = base64.b64encode(clothing_image_bytes).decode('utf-8')
            
            person_data_uri = f"data:image/png;base64,{person_b64}"
            clothing_data_uri = f"data:image/png;base64,{clothing_b64}"
            
            # Map our categories to CatVTON cloth_type
            # upper_body -> upper, lower_body -> lower, dress -> overall
            cloth_type_mapping = {
                "upper_body": "upper",
                "lower_body": "lower", 
                "dress": "overall",
                "shoes": "upper"  # CatVTON treats shoes as upper
            }
            
            cloth_type = cloth_type_mapping.get(category, "upper")
            
            print(f"Using CatVTON cloth_type: {cloth_type}")
            
            # Optimized parameters for best quality
            input_params = {
                "person_image": person_data_uri,
                "garment_image": clothing_data_uri,
                "cloth_type": cloth_type,
                "num_inference_steps": 50,  # Higher for better quality
                "guidance_scale": 2.5,  # Balanced control
                "seed": 42  # Consistent results
            }
            
            print(f"✓ Parameters: steps={input_params['num_inference_steps']}, guidance={input_params['guidance_scale']}")
            
            # Use CatVTON-Flux model (best performance)
            output = replicate.run(
                "mmezhov/catvton-flux",
                input=input_params
            )
            
            print(f"✓ CatVTON API call completed")
            print(f"Output type: {type(output)}")
            
            # Handle different output formats
            if isinstance(output, str):
                print(f"✓ Got URL result: {output[:100]}...")
                return output
            elif isinstance(output, list) and len(output) > 0:
                first_item = output[0]
                if isinstance(first_item, str):
                    print(f"✓ Got URL from list: {first_item[:100]}...")
                    return first_item
                elif hasattr(first_item, 'url'):
                    print(f"✓ Got URL from object: {first_item.url[:100]}...")
                    return first_item.url
                else:
                    result_str = str(first_item)
                    print(f"✓ Converted to string: {result_str[:100]}...")
                    return result_str
            elif hasattr(output, 'url'):
                print(f"✓ Got URL from FileOutput: {output.url[:100]}...")
                return output.url
            else:
                print(f"✗ Unexpected output format: {output}")
                return None
                
        except Exception as e:
            print(f"CatVTON error: {str(e)}")
            import traceback
            traceback.print_exc()
            raise
