import os
import base64
import requests
from typing import Optional
import google.generativeai as genai

class GeminiVirtualFittingService:
    def __init__(self, api_key: str):
        self.api_key = api_key
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel('gemini-2.5-flash-image')
    
    def virtual_try_on(self, person_image_bytes: bytes, clothing_image_bytes: bytes) -> Optional[str]:
        """
        Virtual Try-On using Gemini 2.5 Flash Image (Nano Banana)
        Best quality - preserves hands, face, and background perfectly
        
        Args:
            person_image_bytes: Person image as bytes
            clothing_image_bytes: Clothing image as bytes
        
        Returns:
            Base64 data URI of the result image
        """
        try:
            from PIL import Image
            from io import BytesIO
            
            print(f"\n=== Gemini 2.5 Flash Image Virtual Try-On ===")
            print(f"Person image: {len(person_image_bytes)} bytes ({len(person_image_bytes)/1024:.1f}KB)")
            print(f"Clothing image: {len(clothing_image_bytes)} bytes ({len(clothing_image_bytes)/1024:.1f}KB)")
            
            # Convert bytes to PIL Images
            person_img = Image.open(BytesIO(person_image_bytes))
            clothing_img = Image.open(BytesIO(clothing_image_bytes))
            
            print("Converting images to RGB...")
            person_img = person_img.convert('RGB')
            clothing_img = clothing_img.convert('RGB')
            
            # Create optimized prompt for virtual try-on
            prompt = """Generate a photorealistic virtual try-on image showing this person wearing the clothing item.

CRITICAL REQUIREMENTS:
1. Preserve the person's face, hands, and body EXACTLY as they appear
2. Only replace the existing clothing with the new garment
3. Keep hands, arms, and any objects (books, accessories) completely unchanged
4. Maintain natural skin tones and body proportions
5. Ensure the clothing fits naturally with realistic draping and shadows
6. Match the original photo's lighting and background perfectly
7. Make it look like a real photograph, not an AI composite

The result should look like the person naturally wore this clothing when the photo was taken."""

            print("Calling Gemini 2.5 Flash Image API...")
            
            # Generate with Gemini
            response = self.model.generate_content([
                prompt,
                person_img,
                clothing_img
            ])
            
            print(f"✓ Gemini API call completed")
            
            # Extract image from response
            if response.candidates and len(response.candidates) > 0:
                candidate = response.candidates[0]
                if candidate.content and candidate.content.parts:
                    for part in candidate.content.parts:
                        if hasattr(part, 'inline_data') and part.inline_data:
                            image_data = part.inline_data.data
                            mime_type = part.inline_data.mime_type or 'image/png'
                            
                            # Convert to base64 data URI
                            b64_data = base64.b64encode(image_data).decode('utf-8')
                            data_uri = f"data:{mime_type};base64,{b64_data}"
                            
                            print(f"✓ Generated image: {len(image_data)} bytes")
                            return data_uri
            
            print("✗ No image data in response")
            return None
            
        except Exception as e:
            print(f"Gemini virtual try-on error: {str(e)}")
            import traceback
            traceback.print_exc()
            raise
