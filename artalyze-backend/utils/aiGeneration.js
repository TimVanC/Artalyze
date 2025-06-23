const Replicate = require('replicate');
const sharp = require('sharp');

// Check if required environment variables are set
if (!process.env.REPLICATE_API_TOKEN) {
  console.error('ERROR: REPLICATE_API_TOKEN environment variable is not set');
  throw new Error('REPLICATE_API_TOKEN environment variable is required for AI image generation');
}

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

/**
 * Enhanced negative prompts for more human-like AI art
 */
const getEnhancedNegativePrompt = (style, medium) => {
  const baseNegatives = [
    "ugly", "blurry", "low quality", "distorted", "deformed", "oversaturated",
    "artifacts", "watermark", "signature", "text", "logo", "brand",
    "AI generated", "computer generated", "digital art", "3d render",
    "perfect", "flawless", "synthetic", "artificial", "mechanical",
    "overly detailed", "hyperrealistic", "photorealistic", "too perfect"
  ];

  const styleSpecificNegatives = {
    'photograph': [
      "painting", "drawing", "illustration", "cartoon", "anime",
      "watercolor", "oil painting", "sketch", "digital art"
    ],
    'painting': [
      "photograph", "photo", "realistic", "photorealistic", "3d",
      "digital art", "computer generated", "perfect lines"
    ],
    'sketch': [
      "color", "colored", "painting", "photograph", "3d", "digital art",
      "perfect lines", "too clean", "mechanical"
    ],
    'watercolor': [
      "digital art", "photograph", "oil painting", "perfect", "clean",
      "mechanical", "computer generated", "3d render"
    ]
  };

  const mediumSpecificNegatives = {
    'pencil': ["digital", "perfect lines", "mechanical", "computer generated"],
    'charcoal': ["digital", "perfect", "clean", "mechanical"],
    'oil': ["digital", "perfect", "mechanical", "computer generated"],
    'acrylic': ["digital", "perfect", "mechanical", "computer generated"]
  };

  const negatives = [...baseNegatives];
  
  if (style && styleSpecificNegatives[style.toLowerCase()]) {
    negatives.push(...styleSpecificNegatives[style.toLowerCase()]);
  }
  
  if (medium && mediumSpecificNegatives[medium.toLowerCase()]) {
    negatives.push(...mediumSpecificNegatives[medium.toLowerCase()]);
  }

  return negatives.join(", ");
};

/**
 * Extract style from prompt text
 */
function extractStyleFromPrompt(prompt) {
  const promptLower = prompt.toLowerCase();
  
  if (promptLower.includes('photograph') || promptLower.includes('photo')) return 'photograph';
  if (promptLower.includes('painting') || promptLower.includes('painted')) return 'painting';
  if (promptLower.includes('sketch') || promptLower.includes('drawn')) return 'sketch';
  if (promptLower.includes('watercolor') || promptLower.includes('watercolour')) return 'watercolor';
  if (promptLower.includes('oil') || promptLower.includes('oil painting')) return 'oil';
  if (promptLower.includes('acrylic')) return 'acrylic';
  if (promptLower.includes('charcoal')) return 'charcoal';
  if (promptLower.includes('pencil')) return 'pencil';
  
  return 'mixed';
}

/**
 * Extract medium from prompt text
 */
function extractMediumFromPrompt(prompt) {
  const promptLower = prompt.toLowerCase();
  
  if (promptLower.includes('pencil') || promptLower.includes('graphite')) return 'pencil';
  if (promptLower.includes('charcoal')) return 'charcoal';
  if (promptLower.includes('oil') || promptLower.includes('oil paint')) return 'oil';
  if (promptLower.includes('acrylic')) return 'acrylic';
  if (promptLower.includes('watercolor') || promptLower.includes('watercolour')) return 'watercolor';
  if (promptLower.includes('digital') || promptLower.includes('digital art')) return 'digital';
  
  return 'mixed';
}

/**
 * Add human imperfection cues to the prompt
 */
function addHumanImperfections(prompt, style, medium) {
  const imperfections = {
    'photograph': [
      "slight camera shake", "natural lighting variations", "imperfect focus",
      "grain texture", "natural color variations"
    ],
    'painting': [
      "brush stroke variations", "paint texture", "slight color bleeding",
      "imperfect edges", "natural paint flow"
    ],
    'sketch': [
      "pencil pressure variations", "eraser marks", "paper texture",
      "imperfect lines", "hand-drawn quality"
    ],
    'watercolor': [
      "water flow patterns", "pigment bleeding", "paper texture",
      "imperfect edges", "natural color diffusion"
    ],
    'oil': [
      "thick paint texture", "brush stroke variations", "paint layering",
      "imperfect blending", "natural paint flow"
    ]
  };

  const styleImperfections = imperfections[style] || imperfections['painting'];
  const selectedImperfections = styleImperfections.slice(0, 2); // Use 2 random imperfections

  if (selectedImperfections.length > 0) {
    return `${prompt}, ${selectedImperfections.join(', ')}`;
  }

  return prompt;
}

/**
 * Generate an AI image using Stable Diffusion XL with enhanced parameters
 * @param {string} prompt Image generation prompt
 * @param {Function|null} progressCallback Optional progress callback function
 * @param {Object} dimensions Image dimensions
 * @param {number} dimensions.width Width of the image
 * @param {number} dimensions.height Height of the image
 * @param {Object} metadata Optional metadata for style-specific optimization
 * @returns {Promise<string>} Generated image URL
 */
async function generateAIImage(prompt, progressCallback = null, dimensions = null, metadata = {}) {
  try {
    // Send progress update if callback provided
    if (progressCallback) {
      progressCallback('Initializing AI generation...');
    }

    // Use default dimensions if not provided
    const finalDimensions = dimensions || { width: 512, height: 512 };
    
    // Ensure dimensions are multiples of 8 (required by SDXL)
    const width = Math.round(finalDimensions.width / 8) * 8;
    const height = Math.round(finalDimensions.height / 8) * 8;

    // Extract style and medium from metadata or prompt
    const style = metadata.style || extractStyleFromPrompt(prompt);
    const medium = metadata.medium || extractMediumFromPrompt(prompt);

    // Get enhanced negative prompt
    const negativePrompt = getEnhancedNegativePrompt(style, medium);

    // Enhanced prompt with human imperfection cues
    const enhancedPrompt = addHumanImperfections(prompt, style, medium);

    if (progressCallback) {
      progressCallback('Generating AI image with enhanced parameters...');
    }

    console.log(`Generating AI image with enhanced prompt: ${enhancedPrompt}`);
    console.log(`Negative prompt: ${negativePrompt}`);

    // Generate image using SDXL with optimized parameters
    let output;
    try {
      output = await replicate.run(
        "stability-ai/sdxl:39ed52f2a78e934b3ba6e2a89f5b1c712de7dfea535525255b1aa35c5565e08b",
        {
          input: {
            prompt: enhancedPrompt,
            negative_prompt: negativePrompt,
            width: width,
            height: height,
            num_outputs: 1,
            scheduler: "K_EULER_ANCESTRAL", // Better for artistic styles
            num_inference_steps: 60, // Increased for better quality
            guidance_scale: 8.5, // Slightly higher for better adherence
            prompt_strength: 0.85, // Slightly higher for better prompt following
            seed: Math.floor(Math.random() * 1000000), // Random seed for variety
            refine: "expert_ensemble_refiner", // Use expert ensemble for better quality
            high_noise_frac: 0.8, // Better for artistic styles
          }
        }
      );
    } catch (replicateError) {
      console.error('Replicate API error:', replicateError);
      console.error('Error details:', {
        message: replicateError.message,
        status: replicateError.status,
        statusText: replicateError.statusText,
        response: replicateError.response
      });
      throw new Error(`Replicate API error: ${replicateError.message}`);
    }

    if (!output || !output[0]) {
      throw new Error('No output received from Replicate API');
    }

    if (progressCallback) {
      progressCallback('Processing generated image...');
    }

    // Download the generated image
    const imageUrl = output[0];
    const response = await fetch(imageUrl);
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Process with sharp to ensure webp format and quality
    const processedImage = await sharp(buffer)
      .webp({ quality: 90 })
      .toBuffer();

    if (progressCallback) {
      progressCallback('Uploading to Cloudinary...');
    }

    // Upload to Cloudinary
    const cloudinary = require('cloudinary').v2;
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'artalyze/aiImages',
          format: "webp",
          quality: "auto:best",
          resource_type: "image",
          transformation: [
            { width: 650, crop: "scale" }
          ]
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            reject(error);
          } else {
            resolve(result);
          }
        }
      );

      uploadStream.end(processedImage);
    });

    if (progressCallback) {
      progressCallback('AI generation complete!');
    }

    return uploadResult.secure_url;

  } catch (error) {
    console.error('Error generating AI image:', error);
    if (progressCallback) {
      progressCallback(`Error: ${error.message}`);
    }
    throw error;
  }
}

module.exports = {
  generateAIImage
}; 