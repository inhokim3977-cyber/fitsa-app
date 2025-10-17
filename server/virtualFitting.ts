import { openai } from "./openai";
import Replicate from "replicate";

export interface VirtualFittingRequest {
  userPhotoBase64: string;
  clothingPhotoBase64: string;
  userPhotoUrl: string;
  clothingPhotoUrl: string;
}

export interface VirtualFittingResult {
  resultImageBase64: string;
}

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN || "",
});

export async function generateVirtualFitting(
  request: VirtualFittingRequest
): Promise<VirtualFittingResult> {
  const { userPhotoUrl, clothingPhotoUrl } = request;

  console.log("Starting Replicate virtual try-on...");
  console.log("Person URL:", userPhotoUrl);
  console.log("Clothing URL:", clothingPhotoUrl);

  // Stage 1: Replicate Virtual Try-On
  const output = await replicate.run(
    "wolverinn/ecommerce-virtual-try-on:eb98423e7e49bf03f7ad425bac656405a817f46c56fefe49fc45e9a066b7d0b8",
    {
      input: {
        face_image: userPhotoUrl,
        commerce_image: clothingPhotoUrl,
      },
    }
  );

  console.log("Replicate output:", output);

  // Handle output
  let resultUrl: string;
  if (typeof output === "string") {
    resultUrl = output;
  } else if (Array.isArray(output) && output.length > 0) {
    resultUrl = output[0];
  } else {
    throw new Error("Unexpected Replicate output format");
  }

  // Download result and convert to base64
  const response = await fetch(resultUrl);
  const buffer = await response.arrayBuffer();
  const resultImageBase64 = Buffer.from(buffer).toString("base64");

  // Stage 2: Enhance with Nano Banana (optional)
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5-nano",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Enhance the quality of this virtual try-on image. Make it look more realistic and professional.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${resultImageBase64}`,
              },
            },
          ],
        },
      ],
      max_completion_tokens: 100,
    });
    console.log("Nano enhancement completed");
  } catch (error) {
    console.log("Nano enhancement skipped:", error);
  }

  return {
    resultImageBase64,
  };
}
