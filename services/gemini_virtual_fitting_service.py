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
                prompt = """ABSOLUTE PRIORITY: PRESERVE PERSON'S EXACT BODY SHAPE - NO ALTERATIONS WHATSOEVER

CRITICAL BODY SHAPE PRESERVATION (MANDATORY):
- Leg thickness: IDENTICAL to original - measure and match exactly (DO NOT slim, DO NOT enlarge)
- Waist circumference: IDENTICAL to original (DO NOT narrow, DO NOT widen)
- Hip width: IDENTICAL to original (DO NOT reduce, DO NOT expand)
- Body proportions: IDENTICAL width/height ratio (DO NOT stretch, DO NOT compress)
- Thigh size: IDENTICAL volume (DO NOT thin, DO NOT bulk)
- Calf size: IDENTICAL volume (DO NOT modify)
- Overall physique: ZERO body reshaping - must look EXACTLY same person

STEP 1 - PRESERVE EVERYTHING ABOVE WAIST:
- Face: EXACT same
- Hair: EXACT same
- Arms: EXACT same
- Hands: EXACT same
- Upper body clothing: EXACT same (color, pattern, wrinkles)
- Torso: EXACT same shape
- Objects: EXACT same positions

STEP 2 - REPLACE PANTS ONLY:
- Copy garment image's EXACT fit/style (loose, slim, wide-leg, baggy)
- DO NOT alter fit - apply exactly as shown in garment
- Match fabric texture and color
- Pants should wrap around person's EXISTING leg shape (not reshape legs)

STEP 3 - NATURAL INTEGRATION:
- Match lighting and shadows
- Natural draping for pose
- Keep exact leg position

OUTPUT: SAME person (identical body) with ONLY pants changed - ZERO body modification."""

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
                prompt = """ABSOLUTE PRIORITY: PRESERVE PERSON'S EXACT BODY SHAPE - NO ALTERATIONS WHATSOEVER

CRITICAL BODY SHAPE PRESERVATION (MANDATORY):
- Shoulder width: IDENTICAL to original (DO NOT broaden, DO NOT narrow)
- Torso shape: IDENTICAL to original (DO NOT slim waist, DO NOT enlarge)
- Arm thickness: IDENTICAL to original (DO NOT thin, DO NOT bulk)
- Chest/bust: IDENTICAL to original (DO NOT modify size or shape)
- Body proportions: IDENTICAL (DO NOT stretch, DO NOT compress)
- Overall physique: ZERO body reshaping - must look EXACTLY same person

STEP 1 - PRESERVE EVERYTHING:
- Face: EXACT same
- Hands: EXACT same
- Lower body: EXACT same (pants/skirt unchanged)
- Legs: EXACT same
- Pose: EXACT same
- Objects: EXACT same positions
- Background: EXACT same

STEP 2 - REPLACE UPPER CLOTHING ONLY:
- Copy garment image's EXACT fit/style
- Clothing should wrap around person's EXISTING body shape (not reshape body)
- Match fabric texture and color

STEP 3 - NATURAL INTEGRATION:
- Match lighting and shadows
- Natural fabric draping

OUTPUT: SAME person (identical body) with ONLY upper clothing changed - ZERO body modification."""

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
