const Replicate = require('replicate');
const sharp = require('sharp');

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

/**
 * Generate an AI image using Stable Diffusion XL
 * @param {string} prompt Image generation prompt
 * @param {Object} dimensions Image dimensions
 * @param {number} dimensions.width Width of the image
 * @param {number} dimensions.height Height of the image
 * @returns {Promise<Buffer>} Generated image as a buffer
 */
async function generateAiImage(prompt, dimensions) {
  try {
    // Ensure dimensions are multiples of 8 (required by SDXL)
    const width = Math.round(dimensions.width / 8) * 8;
    const height = Math.round(dimensions.height / 8) * 8;

    // Generate image using SDXL
    const output = await replicate.run(
      "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
      {
        input: {
          prompt: prompt,
          negative_prompt: "ugly, blurry, low quality, distorted, deformed",
          width: width,
          height: height,
          num_outputs: 1,
          scheduler: "K_EULER",
          num_inference_steps: 50,
          guidance_scale: 7.5,
          prompt_strength: 0.8,
        }
      }
    );

    // Download the generated image
    const imageUrl = output[0];
    const response = await fetch(imageUrl);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Process with sharp to ensure webp format and quality
    const processedImage = await sharp(buffer)
      .webp({ quality: 90 })
      .toBuffer();

    return processedImage;

  } catch (error) {
    console.error('Error generating AI image:', error);
    throw error;
  }
}

module.exports = {
  generateAiImage
}; 