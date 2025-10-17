import base64
from openai import OpenAI
from typing import Optional

class OpenAIVirtualFittingService:
    def __init__(self, api_key: str, base_url: str):
        self.client = OpenAI(api_key=api_key, base_url=base_url)
    
    def virtual_try_on(self, person_image_bytes: bytes, clothing_image_bytes: bytes) -> Optional[str]:
        """
        Alternative virtual try-on using OpenAI vision and image generation
        
        Args:
            person_image_bytes: Person image as bytes
            clothing_image_bytes: Clothing image as bytes
        
        Returns:
            Base64 data URL of the result image
        """
        try:
            print(f"\n=== Using OpenAI Virtual Fitting (Fallback) ===")
            
            # Convert to base64
            person_b64 = base64.b64encode(person_image_bytes).decode('utf-8')
            clothing_b64 = base64.b64encode(clothing_image_bytes).decode('utf-8')
            
            # Use gpt-4o to analyze both images and generate a fitting description
            print("Analyzing images with gpt-4o...")
            completion = self.client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": "You are a professional fashion stylist. Analyze these two images: the first is a person, the second is a clothing item. Describe in detail how this person would look wearing this clothing, including: body fit, color coordination, style match, and overall appearance. Be specific about proportions, fabric draping, and realistic fitting details."
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/png;base64,{person_b64}"
                                }
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/png;base64,{clothing_b64}"
                                }
                            }
                        ]
                    }
                ],
                max_completion_tokens=500
            )
            
            description = completion.choices[0].message.content or "Person wearing the clothing item"
            print(f"Generated description: {description[:150]}...")
            
            # Use DALL-E to generate the virtual fitting image
            print("Generating virtual fitting image with DALL-E 3...")
            image_prompt = f"Professional photo of {description}. High quality, realistic, studio lighting, full body shot, fashion photography style."
            
            response = self.client.images.generate(
                model="dall-e-3",
                prompt=image_prompt,
                size="1024x1024",
                quality="standard",
                n=1
            )
            
            result_url = response.data[0].url
            print(f"✓ OpenAI virtual fitting completed: {result_url[:80]}...")
            
            return result_url
            
        except Exception as e:
            print(f"✗ OpenAI virtual fitting error: {str(e)}")
            import traceback
            traceback.print_exc()
            raise
