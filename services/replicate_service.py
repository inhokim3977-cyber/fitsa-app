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
            Base64 data URI of the try-on result image (resized to original)
        """
        try:
            import base64
            from io import BytesIO
            from PIL import Image
            import requests
            
            print(f"\n=== Starting IDM-VTON Virtual Try-On ===")
            print(f"Person image size: {len(person_image_bytes)} bytes ({len(person_image_bytes)/1024:.1f}KB)")
            print(f"Clothing image size: {len(clothing_image_bytes)} bytes ({len(clothing_image_bytes)/1024:.1f}KB)")
            print(f"Category: {category}")
            
            # Store original person image size to restore later
            person_img = Image.open(BytesIO(person_image_bytes))
            original_size = person_img.size
            print(f"Original person image size: {original_size}")
            
            # Method 1: Try with base64 data URIs (works for images < 1MB, most reliable)
            person_b64 = base64.b64encode(person_image_bytes).decode('utf-8')
            clothing_b64 = base64.b64encode(clothing_image_bytes).decode('utf-8')
            
            person_data_uri = f"data:image/png;base64,{person_b64}"
            clothing_data_uri = f"data:image/png;base64,{clothing_b64}"
            
            print("Using base64 data URIs with optimized parameters...")
            
            # Optimized parameters for preserving hands and background
            # Higher steps = more accurate clothing region detection
            # Lower guidance = preserve more of original image
            input_params = {
                "human_img": person_data_uri,
                "garm_img": clothing_data_uri,
                "category": category,
                "garment_des": "clothing item only, preserve hands and background",
                "n_steps": 40,  # Increased for better accuracy
                "guidance_scale": 1.5,  # Reduced to preserve more original
                "seed": 42  # Consistent results
            }
            
            print(f"✓ Parameters: steps={input_params['n_steps']}, guidance={input_params['guidance_scale']}")
            
            # Use the correct IDM-VTON model version (verified working 2025)
            output = replicate.run(
                "cuuupid/idm-vton:c871bb9b046607b680449ecbae55fd8c6d945e0a1948644bf2361b3d021d3ff4",
                input=input_params
            )
            print(f"✓ Replicate API call completed")
            
            print(f"Output type: {type(output)}")
            
            # Extract URL from various output formats
            result_url = None
            if isinstance(output, str):
                result_url = output
                print(f"✓ Got URL result: {result_url[:100]}...")
            elif isinstance(output, list) and len(output) > 0:
                first_item = output[0]
                if isinstance(first_item, str):
                    result_url = first_item
                    print(f"✓ Got URL from list: {result_url[:100]}...")
                elif hasattr(first_item, 'url'):
                    result_url = first_item.url
                    print(f"✓ Got URL from object: {result_url[:100]}...")
                else:
                    result_url = str(first_item)
                    print(f"✓ Converted to string: {result_url[:100]}...")
            elif hasattr(output, 'url'):
                result_url = output.url
                print(f"✓ Got URL from FileOutput: {result_url[:100]}...")
            else:
                print(f"✗ Unexpected output format: {output}")
                return None
            
            if not result_url:
                print(f"✗ No URL extracted from output")
                return None
            
            # Download the result image
            print(f"Downloading result image from: {result_url[:80]}...")
            response = requests.get(result_url, timeout=30)
            response.raise_for_status()
            result_bytes = response.content
            print(f"✓ Downloaded: {len(result_bytes)} bytes ({len(result_bytes)/1024:.1f}KB)")
            
            # Resize to original dimensions (preserve aspect ratio)
            result_img = Image.open(BytesIO(result_bytes))
            print(f"IDM-VTON output size: {result_img.size}")
            
            if result_img.size != original_size:
                print(f"Resizing from {result_img.size} to original {original_size}")
                result_img = result_img.resize(original_size, Image.Resampling.LANCZOS)
            
            # Convert to base64 data URI (same format as Gemini)
            output_buffer = BytesIO()
            result_img.save(output_buffer, format='PNG')
            resized_data = output_buffer.getvalue()
            
            b64_data = base64.b64encode(resized_data).decode('utf-8')
            data_uri = f"data:image/png;base64,{b64_data}"
            
            print(f"✓ Final image: {len(resized_data)} bytes (size: {original_size})")
            return data_uri
                
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
