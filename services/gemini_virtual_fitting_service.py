import os
import base64
import requests
from typing import Optional
from google import genai
from google.genai import types

class GeminiVirtualFittingService:
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.client = genai.Client(api_key=api_key)
    
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
                prompt = """CRITICAL VIRTUAL TRY-ON TASK: Person must wear ONLY the dress garment - NOTHING ELSE.

STEP 1 - COMPLETE CLOTHING REMOVAL (MANDATORY):
- DELETE all original top clothing (shirt, blouse, jacket - REMOVE EVERYTHING from upper body)
- DELETE all original bottom clothing (pants, jeans, skirt, shorts - REMOVE EVERYTHING from lower body)
- Person should be NAKED before putting on dress
- CRITICAL: If person wears jeans/pants in original photo → COMPLETELY REMOVE THEM
- CRITICAL: If person wears shirt/top in original photo → COMPLETELY REMOVE IT

STEP 2 - ADD DRESS ONLY:
- Put ONLY the dress on the person
- Match exact dress length from garment image
- Match exact dress style, color, pattern
- Natural fabric draping and folds

STEP 3 - LEG VISIBILITY (CRITICAL):
- IF dress is SHORT (above knee, mini dress, knee-length): Show BARE LEGS from hemline to feet
- IF dress is LONG (below knee, maxi dress): Dress covers legs
- ABSOLUTELY NO jeans/pants/leggings visible under dress
- ABSOLUTELY NO original bottom clothing visible

STEP 4 - PRESERVE:
- Face: EXACT same
- Hands and arms: EXACT same  
- Body shape: ZERO modification
- Pose: EXACT same
- Background and objects: EXACT same

FINAL CHECK:
- Is person wearing ONLY the dress? YES/NO
- Are jeans/pants COMPLETELY GONE? YES/NO
- Are bare legs visible if dress is short? YES/NO

OUTPUT: Same person wearing ONLY THE DRESS with no other clothing. If dress is short, bare legs must be visible."""

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
- Hands: EXACT same (show hands at wrist)
- Lower body: EXACT same (pants/skirt unchanged)
- Legs: EXACT same
- Pose: EXACT same
- Objects: EXACT same positions
- Background: EXACT same

STEP 2 - REPLACE UPPER CLOTHING WITH EXACT SLEEVE LENGTH:
- Copy garment's EXACT sleeve length (long sleeve, 3/4 sleeve, short sleeve, or sleeveless)
- IF GARMENT IS LONG SLEEVE: Cover entire arm, show ONLY hands (NO exposed arm skin)
- IF GARMENT IS SHORT SLEEVE: Cover shoulder, expose lower arm and hands
- IF GARMENT IS SLEEVELESS: Show entire arm
- Match garment's fabric texture, color, and pattern EXACTLY
- Clothing wraps around person's EXISTING body shape (not reshape body)

STEP 3 - NATURAL INTEGRATION:
- Sleeves must drape naturally following arm position
- Match lighting and shadows
- Natural fabric wrinkles and folds

OUTPUT: SAME person (identical body) with ONLY upper clothing changed + CORRECT sleeve length - ZERO body modification."""

            print("Calling Gemini 2.5 Flash Image API...")
            
            # Add critical size preservation to prompt
            size_instruction = f"\n\nCRITICAL: Output image MUST be EXACTLY {original_size[0]}x{original_size[1]} pixels (width x height). DO NOT change dimensions - this will distort body proportions."
            final_prompt = prompt + size_instruction
            
            # Configure for IMAGE generation with new API
            print("📸 Requesting IMAGE generation from Gemini (new API)...")
            
            config = types.GenerateContentConfig(
                temperature=0.1,  # Minimal creativity, maximum preservation
                top_p=0.7,        # Reduced randomness
                top_k=20,         # Fewer options for more consistency
                response_modalities=["IMAGE"],  # ← KEY: Request image output!
            )
            
            # Generate with Gemini using new API
            response = self.client.models.generate_content(
                model="gemini-2.5-flash-image",
                contents=[final_prompt, person_img, clothing_img],
                config=config
            )
            
            print(f"✓ Gemini API call completed (new API)")
            print(f"🔍 Response has {len(response.parts) if response.parts else 0} parts")
            
            # Extract image from response (new API format)
            if response.parts:
                for part in response.parts:
                    if part.inline_data is not None:
                        # Get image bytes directly from inline_data
                        image_bytes = part.inline_data.data
                        
                        # Convert to PIL Image to check size
                        result_img = Image.open(BytesIO(image_bytes))
                        generated_size = result_img.size
                        print(f"Generated image size: {generated_size}, Original: {original_size}")
                        
                        if generated_size != original_size:
                            print(f"⚠️ WARNING: Size mismatch detected - this may distort body proportions")
                            print(f"⚠️ Using generated size AS-IS to preserve body shape")
                        
                        # Convert to base64 data URI
                        b64_data = base64.b64encode(image_bytes).decode('utf-8')
                        data_uri = f"data:image/png;base64,{b64_data}"
                        
                        print(f"✓ Generated image: {len(image_bytes)} bytes (size: {generated_size})")
                        return data_uri
            
            print("✗ No image data in response")
            return None
            
        except Exception as e:
            print(f"Gemini virtual try-on error: {str(e)}")
            import traceback
            traceback.print_exc()
            raise
