const OpenAI = require('openai');
const cloudinary = require('cloudinary').v2;
const sharp = require('sharp');
const axios = require('axios');
const streamifier = require('streamifier');

// Initialize OpenAI with API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Maximum retries for AI generation
const MAX_RETRIES = 3;
// Delay between retries (in milliseconds)
const RETRY_DELAY = 5000;

/**
 * Get the appropriate DALL·E size based on aspect ratio
 * @param {number} width - Image width
 * @param {number} height - Image height
 * @returns {string} - DALL·E size string
 */
const getDalleSize = (width, height) => {
  const aspectRatio = width / height;
  
  if (aspectRatio >= 1.6) {
    return "1792x1024"; // Wide
  } else if (aspectRatio <= 0.7) {
    return "1024x1792"; // Tall
  } else {
    return "1024x1024"; // Square
  }
};

/**
 * Get image dimensions from Cloudinary URL
 * @param {string} imageUrl - Cloudinary URL
 * @returns {Promise<{width: number, height: number}>} - Image dimensions
 */
const getImageDimensions = async (imageUrl) => {
  try {
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const metadata = await sharp(Buffer.from(response.data)).metadata();
    return {
      width: metadata.width,
      height: metadata.height
    };
  } catch (error) {
    console.error('Error getting image dimensions:', error);
    // Default to square if we can't get dimensions
    return { width: 1024, height: 1024 };
  }
};

const validateImage = async (imageUrl) => {
  try {
    // Download image for validation
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data);

    // Use sharp to analyze image
    const metadata = await sharp(buffer).metadata();

    // Basic validation criteria
    const isValidSize = metadata.width >= 512 && metadata.height >= 512;
    const isValidFormat = ['jpeg', 'png', 'webp'].includes(metadata.format);
    
    // Check if image is not completely black or white
    const stats = await sharp(buffer).stats();
    const channels = stats.channels;
    const isMonochrome = channels.every(channel => {
      const mean = channel.mean;
      return mean < 5 || mean > 250;
    });

    return {
      isValid: isValidSize && isValidFormat && !isMonochrome,
      issues: {
        size: !isValidSize ? 'Image is too small' : null,
        format: !isValidFormat ? 'Invalid image format' : null,
        quality: isMonochrome ? 'Image appears to be monochrome' : null
      }
    };
  } catch (error) {
    console.error('Error validating image:', error);
    // Return true to skip validation if there's an error
    return {
      isValid: true,
      issues: {
        error: 'Failed to validate image, proceeding anyway'
      }
    };
  }
};

/**
 * Generates an AI image using DALL·E 3
 * @param {string} prompt - The prompt for image generation
 * @param {string} referenceImageUrl - URL of the reference image for aspect ratio matching
 * @param {Function} [progressCallback] - Optional callback for progress updates
 * @returns {Promise<string>} - The generated image URL
 */
const generateAIImage = async (prompt, referenceImageUrl, progressCallback = null) => {
  let lastError = null;
  
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (progressCallback) {
        progressCallback(`Attempt ${attempt}: Getting reference image dimensions...`);
      }

      // Get dimensions from reference image
      const { width, height } = await getImageDimensions(referenceImageUrl);
      const dalleSize = getDalleSize(width, height);

      if (progressCallback) {
        progressCallback(`Attempt ${attempt}: Generating AI image with DALL·E 3 (${dalleSize})...`);
      }

      // Generate image with DALL·E 3
      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: dalleSize,
        quality: "standard",
        style: "natural"
      });

      const imageUrl = response.data[0].url;

      if (progressCallback) {
        progressCallback('AI image generated, validating...');
      }

      // Validate the generated image
      const validation = await validateImage(imageUrl);
      if (!validation.isValid) {
        console.warn('Image validation issues:', validation.issues);
      }

      if (progressCallback) {
        progressCallback('Image validated, downloading and processing...');
      }

      // Download the image
      const imageResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      const imageBuffer = Buffer.from(imageResponse.data);

      // Process with sharp to resize and convert to webp
      const processedBuffer = await sharp(imageBuffer)
        .resize(600, null, { // Resize to 600px width, maintain aspect ratio
          withoutEnlargement: true,
          fit: 'inside'
        })
        .webp({ quality: 90 })
        .toBuffer();

      if (progressCallback) {
        progressCallback('Image processed, uploading to Cloudinary...');
      }

      // Upload to Cloudinary
      const uploadResult = await uploadToCloudinary(processedBuffer);

      if (progressCallback) {
        progressCallback('Process completed successfully');
      }

      return uploadResult.secure_url;

    } catch (error) {
      lastError = error;
      console.error(`Attempt ${attempt} failed:`, error);

      if (error.status === 429 || (error.error?.type === 'quota_exceeded')) {
        console.error('Rate limit or quota exceeded:', error);
        if (progressCallback) {
          progressCallback('API quota exceeded. Skipping generation.');
        }
        return null;
      }

      if (progressCallback) {
        progressCallback(`Attempt ${attempt} failed, ${attempt < MAX_RETRIES ? 'retrying...' : 'giving up.'}`);
      }

      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      }
      continue;
    }
  }

  console.error(`Failed to generate AI image after ${MAX_RETRIES} attempts:`, lastError);
  return null;
};

/**
 * Gets Cloudinary upload options based on medium
 * @param {string} medium - The artwork medium
 * @returns {Object} - Cloudinary upload options
 */
const getCloudinaryOptions = (medium) => {
  const baseOptions = {
    folder: 'artalyze/aiImages',
    format: 'webp',
    quality: 'auto:best',
    flags: 'preserve_transparency',
    fetch_format: 'auto',
    transformation: [
      { width: 650, crop: "scale" }
    ]
  };

  const effect = (() => {
    switch (medium?.toLowerCase()) {
      case 'pencil sketch':
      case 'charcoal':
        return 'art:zorro';
      case 'watercolor':
        return 'art:athena';
      case 'oil painting':
        return 'oil_paint:100';
      case 'photograph':
        return 'improve';
      default:
        return null;
    }
  })();

  if (effect) {
    baseOptions.transformation.push({ effect });
  }

  return baseOptions;
};

const uploadToCloudinary = async (imageBuffer, metadata) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'artalyze/aiImages',
        format: 'webp',
        quality: 'auto:best',
        flags: 'preserve_transparency',
        fetch_format: 'auto',
        transformation: [
          { width: 600, crop: "scale" }
        ]
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    streamifier.createReadStream(imageBuffer).pipe(uploadStream);
  });
};

module.exports = {
  generateAIImage,
  validateImage
}; 