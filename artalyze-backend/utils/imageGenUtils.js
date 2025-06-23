const OpenAI = require('openai');
const sharp = require('sharp');

// Check if required environment variables are set
if (!process.env.OPENAI_API_KEY) {
  console.error('ERROR: OPENAI_API_KEY environment variable is not set');
  throw new Error('OPENAI_API_KEY environment variable is required for AI image generation');
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
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
 * Generate an AI image using DALL-E 3 with enhanced parameters
 * @param {string} prompt Image generation prompt
 * @param {Object} dimensions Image dimensions
 * @param {number} dimensions.width Width of the image
 * @param {number} dimensions.height Height of the image
 * @param {Object} metadata Optional metadata for style-specific optimization
 * @returns {Promise<Buffer>} Generated image as a buffer
 */
async function generateAiImage(prompt, dimensions, metadata = {}) {
  try {
    // Sanitize the prompt to avoid content policy violations
    const sanitizedPrompt = sanitizePrompt(prompt);
    console.log(`Original prompt: ${prompt}`);
    console.log(`Sanitized prompt: ${sanitizedPrompt}`);

    // Use default dimensions if not provided
    const finalDimensions = dimensions || { width: 1024, height: 1024 };
    
    // DALL-E 3 supports specific sizes, so we need to map to supported options
    const getDalleSize = (width, height) => {
      const aspectRatio = width / height;
      
      if (aspectRatio === 1) return "1024x1024";
      if (aspectRatio > 1) return "1792x1024"; // Landscape
      if (aspectRatio < 1) return "1024x1792"; // Portrait
      
      return "1024x1024"; // Default to square
    };

    const dalleSize = getDalleSize(finalDimensions.width, finalDimensions.height);

    console.log(`Generating DALL-E 3 image with prompt: ${sanitizedPrompt}`);
    console.log(`Size: ${dalleSize}`);

    // Generate image using DALL-E 3
    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: sanitizedPrompt,
      n: 1,
      size: dalleSize,
      quality: "hd", // HD quality for better results
      style: "natural" // Natural style for more human-like results
    });

    // Get the image URL from the response
    const imageUrl = response.data[0].url;
    
    if (!imageUrl) {
      throw new Error('No image URL received from DALL-E 3');
    }

    // Download the generated image
    const imageResponse = await fetch(imageUrl);
    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Process with sharp to ensure webp format and quality
    const processedImage = await sharp(buffer)
      .webp({ quality: 90 })
      .toBuffer();

    return processedImage;

  } catch (error) {
    console.error('Error generating AI image with DALL-E 3:', error);
    
    // Handle specific DALL-E 3 content policy errors
    if (error.status === 400 && error.error?.type === 'image_generation_user_error') {
      const contentError = new Error('DALL-E 3 rejected the prompt due to content policy violations. Please try with a different image or description.');
      contentError.name = 'ContentPolicyError';
      throw contentError;
    }
    
    // Handle other specific errors
    if (error.message && error.message.includes('timeout')) {
      const timeoutError = new Error('DALL-E 3 generation timed out. This can take 30-60 seconds. Please try again.');
      timeoutError.name = 'TimeoutError';
      throw timeoutError;
    }
    
    if (error.message && error.message.includes('billing')) {
      const billingError = new Error('OpenAI billing issue. Please check your OpenAI account billing status.');
      billingError.name = 'BillingError';
      throw billingError;
    }
    
    throw error;
  }
}

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
 * Sanitize prompt to avoid DALL-E 3 content policy violations
 */
function sanitizePrompt(prompt) {
  if (!prompt) return '';
  
  // Remove potentially problematic content
  const problematicTerms = [
    'nude', 'naked', 'explicit', 'sexual', 'violence', 'blood', 'gore',
    'weapon', 'gun', 'knife', 'sword', 'bomb', 'explosion', 'fire',
    'celebrity', 'famous person', 'politician', 'real person',
    'copyright', 'trademark', 'logo', 'brand', 'company'
  ];
  
  let sanitized = prompt.toLowerCase();
  problematicTerms.forEach(term => {
    sanitized = sanitized.replace(new RegExp(term, 'gi'), '');
  });
  
  // Clean up extra spaces and punctuation
  sanitized = sanitized.replace(/\s+/g, ' ').trim();
  
  // Ensure the prompt is not empty after sanitization
  if (!sanitized || sanitized.length < 10) {
    return 'abstract art composition with vibrant colors and artistic elements';
  }
  
  return sanitized;
}

module.exports = {
  generateAiImage
}; 