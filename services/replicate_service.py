import replicate
import os
from typing import Optional

class ReplicateService:
    def __init__(self, api_token: str):
        self.api_token = api_token
        os.environ['REPLICATE_API_TOKEN'] = api_token
    
    def virtual_try_on(self, person_image_bytes: bytes, clothing_image_bytes: bytes, category: str = "upper_body") -> Optional[str]:
        """
        Stage 1: Virtual Try-On using Replicate's IDM-VTON model (best-in-class)
        
        Args:
            person_image_bytes: Person image as bytes
            clothing_image_bytes: Clothing image as bytes
            category: Clothing category - "upper_body", "lower_body", or "dresses"
        
        Returns:
            URL of the try-on result image
        """
        try:
            import base64
            from io import BytesIO
            
            print(f"\n=== Starting IDM-VTON Virtual Try-On ===")
            print(f"Person image size: {len(person_image_bytes)} bytes ({len(person_image_bytes)/1024:.1f}KB)")
            print(f"Clothing image size: {len(clothing_image_bytes)} bytes ({len(clothing_image_bytes)/1024:.1f}KB)")
            print(f"Category: {category}")
            
            # Method 1: Try with base64 data URIs (works for images < 1MB, most reliable)
            person_b64 = base64.b64encode(person_image_bytes).decode('utf-8')
            clothing_b64 = base64.b64encode(clothing_image_bytes).decode('utf-8')
            
            person_data_uri = f"data:image/png;base64,{person_b64}"
            clothing_data_uri = f"data:image/png;base64,{clothing_b64}"
            
            print("Using base64 data URIs for image input...")
            
            # Use the correct IDM-VTON model version (verified working 2025)
            output = replicate.run(
                "cuuupid/idm-vton:c871bb9b046607b680449ecbae55fd8c6d945e0a1948644bf2361b3d021d3ff4",
                input={
                    "human_img": person_data_uri,
                    "garm_img": clothing_data_uri,
                    "category": category,
                    "garment_des": "high quality fashion clothing with clear visible details, natural realistic fit, well-defined fabric texture, proper color accuracy"
                }
            )
            print(f"✓ Replicate API call completed")
            
            print(f"Output type: {type(output)}")
            
            # IDM-VTON typically returns a URL string directly
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
            print(f"Replicate error: {str(e)}")
            import traceback
            traceback.print_exc()
            raise
    
    def enhance_face_and_hands(self, image_url: str) -> Optional[str]:
        """
        Enhance face and hands using CodeFormer (face/hand restoration)
        
        Args:
            image_url: URL of the image to enhance
        
        Returns:
            URL of the enhanced image
        """
        try:
            print(f"\n=== CodeFormer Face & Hand Enhancement ===")
            print(f"Input URL: {image_url[:100]}...")
            
            output = replicate.run(
                "sczhou/codeformer:7de2ea26c616d5bf2245ad0d5e24f0ff9a6204578a5c876db53142edd9d2cd56",
                input={
                    "image": image_url,
                    "upscale": 2,
                    "face_upsample": True,
                    "background_enhance": True,
                    "codeformer_fidelity": 0.7
                }
            )
            
            print(f"✓ CodeFormer completed")
            print(f"Output type: {type(output)}")
            
            # Handle different output formats
            if isinstance(output, str):
                print(f"✓ Enhanced URL: {output[:100]}...")
                return output
            elif hasattr(output, 'url'):
                print(f"✓ Enhanced URL from object: {output.url[:100]}...")
                return output.url
            elif isinstance(output, list) and len(output) > 0:
                first = output[0]
                if isinstance(first, str):
                    return first
                elif hasattr(first, 'url'):
                    return first.url
            
            print(f"✗ Unexpected output format: {output}")
            return None
            
        except Exception as e:
            print(f"CodeFormer error: {str(e)}")
            import traceback
            traceback.print_exc()
            raise
