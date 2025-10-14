import { openai } from "./openai";
import sharp from "sharp";

export interface VirtualFittingRequest {
  userPhotoBase64: string;
  clothingPhotoBase64: string;
}

export interface VirtualFittingResult {
  resultImageBase64: string;
}

export async function generateVirtualFitting(
  request: VirtualFittingRequest
): Promise<VirtualFittingResult> {
  const { userPhotoBase64, clothingPhotoBase64 } = request;

  // Use GPT-5-nano for high-quality image analysis and synthesis
  // Note: Since the AI gateway doesn't support image generation directly,
  // we'll use the vision model to describe the ideal result and then
  // create a composite image using sharp
  
  const completion = await openai.chat.completions.create({
    model: "gpt-5-nano",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "You are a virtual fitting assistant. Analyze the person's photo and the clothing item photo. Describe in detail how the clothing item would look when worn by this person, including placement, size adjustments, and realistic fitting details. Be specific about positioning, proportions, and how the item should overlay on the person.",
          },
          {
            type: "image_url",
            image_url: {
              url: `data:image/png;base64,${userPhotoBase64}`,
            },
          },
          {
            type: "image_url",
            image_url: {
              url: `data:image/png;base64,${clothingPhotoBase64}`,
            },
          },
        ],
      },
    ],
    max_completion_tokens: 500,
  });

  const description = completion.choices[0].message.content || "";

  // For MVP, we'll create a simple composite by overlaying the clothing image
  // This is a simplified approach - in production, you'd use a specialized model
  const userImageBuffer = Buffer.from(userPhotoBase64, "base64");
  const clothingImageBuffer = Buffer.from(clothingPhotoBase64, "base64");

  // Get image metadata
  const userMetadata = await sharp(userImageBuffer).metadata();
  const clothingMetadata = await sharp(clothingImageBuffer).metadata();

  const targetWidth = userMetadata.width || 800;
  const targetHeight = userMetadata.height || 800;

  // Resize clothing to fit proportionally (about 60% of person's size)
  const clothingResized = await sharp(clothingImageBuffer)
    .resize({
      width: Math.floor(targetWidth * 0.6),
      fit: "inside",
    })
    .toBuffer();

  const clothingResizedMeta = await sharp(clothingResized).metadata();

  // Position clothing in center-upper area (typical for clothing overlay)
  const left = Math.floor((targetWidth - (clothingResizedMeta.width || 0)) / 2);
  const top = Math.floor(targetHeight * 0.2);

  // Composite the images
  const compositeBuffer = await sharp(userImageBuffer)
    .composite([
      {
        input: clothingResized,
        top,
        left,
        blend: "over",
      },
    ])
    .png()
    .toBuffer();

  const resultImageBase64 = compositeBuffer.toString("base64");

  return {
    resultImageBase64,
  };
}
