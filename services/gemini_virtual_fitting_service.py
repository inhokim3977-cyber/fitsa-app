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
    
    def virtual_try_on(self, person_image_bytes: bytes, clothing_image_bytes: bytes, category: str = 'upper_body') -> Optional[str]:
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
            print(f"Category: {category}")
            print(f"Person image: {len(person_image_bytes)} bytes ({len(person_image_bytes)/1024:.1f}KB)")
            print(f"Clothing image: {len(clothing_image_bytes)} bytes ({len(clothing_image_bytes)/1024:.1f}KB)")
            
            # Convert bytes to PIL Images
            person_img = Image.open(BytesIO(person_image_bytes))
            clothing_img = Image.open(BytesIO(clothing_image_bytes))
            
            # Store original size to restore later
            original_size = person_img.size
            print(f"Original person image size: {original_size}")
            
            print("Converting images to RGB...")
            person_img = person_img.convert('RGB')
            clothing_img = clothing_img.convert('RGB')
            
            # Create category-specific prompt
            if category == 'hat':
                prompt = """TASK: Digital hat overlay on photo (like Photoshop layer)

STEP 1 - PRESERVE ORIGINAL:
Copy the person's photo EXACTLY as-is. Do NOT regenerate, redraw, or modify:
- Face: Keep identical
- Hair: Keep identical  
- Body: Keep identical
- Hands: Keep identical
- Books/objects: Keep identical
- Background: Keep identical

STEP 2 - ADD HAT LAYER:
Place ONLY the hat on top of the person's head:
- Hat size: Scale to fit head naturally
- Hat position: Rest on top of head (not floating, not sinking)
- Hat angle: Match head tilt
- Shadows: Add subtle shadow under brim only
- Lighting: Match photo's light direction

STEP 3 - OUTPUT:
Return the original photo with ONLY a hat digitally added on top.
Same dimensions as input. This is a simple overlay - do not alter anything else."""

            elif category == 'lower_body':
                prompt = """You are a professional photo editor. Replace only the lower body clothing (pants/trousers) in this photo.

STRICT REQUIREMENTS:
1. EXACT PRESERVATION: The person's face, hands, arms, upper body clothing, and all objects (books, cups, blankets) must remain PIXEL-PERFECT identical to the original
2. PRESERVE BODY SHAPE: Keep the person's leg thickness, body volume, and physique EXACTLY as in original - DO NOT make legs slimmer or thinner
3. REPLACE LOWER BODY ONLY: Change ONLY the pants/trousers from waist down to ankles
4. PRESERVE UPPER CLOTHING: Keep the shirt/top EXACTLY as it is - same color, same pattern, same wrinkles
5. MATCH GARMENT IMAGE EXACTLY:
   - Copy the EXACT fit/width of the pants from the garment image (loose, slim, wide-leg, etc.)
   - DO NOT make pants slimmer or tighter than shown in garment image
   - Match the exact style: straight, bootcut, wide-leg, baggy - whatever the garment shows
   - Keep the same fabric texture and wrinkles as garment image
6. REALISTIC INTEGRATION:
   - Match the lighting direction and intensity from the original photo
   - Add natural shadows and fabric draping
   - Ensure pants match the person's sitting/standing position naturally
   - Pants should not change the leg position or posture
7. PRESERVE SITTING POSE: If person is sitting, keep the exact way pants drape over legs and chair
8. SAME DIMENSIONS: Output image must be EXACTLY the same size as the input

This is a simple lower body clothing replacement - do not regenerate, modify face/hands/upper body/objects, alter body shape/volume, or change the fit of the garment."""

            elif category == 'shoes':
                prompt = """Generate a photorealistic image showing this person wearing these shoes.

CRITICAL REQUIREMENTS:
1. PRESERVE EVERYTHING: Keep face, body, hands, clothing, objects EXACTLY as in original
2. REPLACE SHOES ONLY: Change ONLY the footwear
3. PRESERVE POSE: Keep exact foot/leg position unchanged
4. NATURAL FIT: Shoes should fit naturally

OUTPUT: Same photo with ONLY the shoes changed."""

            elif category == 'glasses':
                prompt = """Generate a photorealistic image showing this person wearing these glasses/eyewear.

CRITICAL REQUIREMENTS:
1. PRESERVE EVERYTHING: Keep face, hair, body, hands, clothing, objects EXACTLY as in original
2. ADD GLASSES ONLY: Place the glasses naturally on the person's face
3. PRESERVE FACE: Keep facial features, expression unchanged
4. NATURAL FIT: Glasses should fit naturally on the face

OUTPUT: Same photo with ONLY the glasses added."""

            elif category == 'dress':
                prompt = """Generate a photorealistic image showing this person wearing this dress/one-piece outfit.

CRITICAL REQUIREMENTS:
1. PRESERVE FACE & HANDS: Keep face, hands, skin tone EXACTLY as in original
2. REPLACE ENTIRE OUTFIT: Change the full-body clothing to the dress
3. PRESERVE POSE: Keep exact body position, sitting/standing pose unchanged
4. PRESERVE OBJECTS: Keep books, blankets, furniture in exact positions
5. NATURAL FIT: Dress should fit naturally with realistic draping

OUTPUT: Same photo with ONLY the full outfit changed to the dress."""

            else:  # upper_body or default
                prompt = """Generate a photorealistic image showing this person wearing this clothing item.

CRITICAL REQUIREMENTS:
1. PRESERVE EXACT POSE: Keep person's exact body position, leg position, posture UNCHANGED
2. PRESERVE ANATOMY: Person must have exactly TWO legs and TWO arms - no duplicates
3. PRESERVE FACE & HANDS: Keep face, hands, fingers, skin tone EXACTLY as in original
4. PRESERVE OBJECTS: Keep all objects (books, coffee cups, blankets) in exact positions
5. REPLACE UPPER CLOTHING ONLY: Change ONLY the upper body clothing item
6. PRESERVE LOWER BODY: Keep pants/skirt exactly as in original
7. PRESERVE BACKGROUND: Keep background, furniture, environment identical
8. NATURAL FIT: New clothing should fit naturally with realistic shadows

OUTPUT: Same photo with ONLY the upper body clothing changed."""

            print("Calling Gemini 2.5 Flash Image API...")
            
            # Configure generation parameters for better quality
            # Very low temperature for maximum preservation of original photo
            generation_config = {
                'temperature': 0.1,  # Minimal creativity, maximum preservation
                'top_p': 0.7,        # Reduced randomness
                'top_k': 20,         # Fewer options for more consistency
            }
            
            # Generate with Gemini
            response = self.model.generate_content(
                [prompt, person_img, clothing_img],
                generation_config=generation_config
            )
            
            print(f"✓ Gemini API call completed")
            
            # Extract image from response
            if response.candidates and len(response.candidates) > 0:
                candidate = response.candidates[0]
                if candidate.content and candidate.content.parts:
                    for part in candidate.content.parts:
                        if hasattr(part, 'inline_data') and part.inline_data:
                            image_data = part.inline_data.data
                            mime_type = part.inline_data.mime_type or 'image/png'
                            
                            # Resize to original dimensions
                            result_img = Image.open(BytesIO(image_data))
                            if result_img.size != original_size:
                                print(f"Resizing from {result_img.size} to original {original_size}")
                                result_img = result_img.resize(original_size, Image.Resampling.LANCZOS)
                            
                            # Convert back to bytes
                            output_buffer = BytesIO()
                            result_img.save(output_buffer, format='PNG')
                            resized_data = output_buffer.getvalue()
                            
                            # Convert to base64 data URI
                            b64_data = base64.b64encode(resized_data).decode('utf-8')
                            data_uri = f"data:image/png;base64,{b64_data}"
                            
                            print(f"✓ Generated image: {len(resized_data)} bytes (size: {original_size})")
                            return data_uri
            
            print("✗ No image data in response")
            return None
            
        except Exception as e:
            print(f"Gemini virtual try-on error: {str(e)}")
            import traceback
            traceback.print_exc()
            raise
