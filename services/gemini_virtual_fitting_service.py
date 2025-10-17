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

CRITICAL REQUIREMENTS - MUST FOLLOW EXACTLY:
1. PRESERVE EXACT POSE: Keep the person's exact body position, leg position, and posture UNCHANGED
2. PRESERVE ANATOMY: The person must have exactly TWO legs and TWO arms - no duplicates
3. PRESERVE FACE & HANDS: Keep face, hands, fingers, and skin tone EXACTLY as in original
4. PRESERVE OBJECTS: Keep all objects (books, coffee cups, blankets) in their exact positions
5. ONLY REPLACE CLOTHING: Change ONLY the clothing item, nothing else
6. PRESERVE COMPOSITION: Keep the same camera angle, framing, and image dimensions
7. PRESERVE BACKGROUND: Keep background, furniture, and environment identical
8. NATURAL FIT: The new clothing should fit naturally with realistic shadows and draping
9. SAME LIGHTING: Match the original photo's lighting and color temperature exactly

OUTPUT: A photorealistic image where ONLY the clothing has changed. Everything else must be identical to the original photo."""

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
