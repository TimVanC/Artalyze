const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Get the 5 oldest unused human images from Cloudinary
 * @param {number} count Number of images to retrieve
 * @returns {Promise<Array>} Array of image objects with url, width, height
 */
async function getOldestUnusedImages(count) {
  try {
    // Get all images in the humanImages folder, excluding the used subfolder
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: 'artalyze/humanImages',
      max_results: 500,
      tags: true,
      metadata: true
    });

    // Filter out images from the 'used' folder
    const unusedImages = result.resources
      .filter(resource => !resource.public_id.includes('/used/'))
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      .slice(0, count)
      .map(image => ({
        publicId: image.public_id,
        url: image.secure_url,
        width: image.width,
        height: image.height,
        format: image.format
      }));

    return unusedImages;
  } catch (error) {
    console.error('Error fetching unused images:', error);
    throw error;
  }
}

/**
 * Move an image to the used folder
 * @param {string} publicId Original public ID of the image
 * @returns {Promise<string>} New public ID in used folder
 */
async function moveToUsed(publicId) {
  try {
    const newPublicId = publicId.replace('humanImages/', 'humanImages/used/');
    await cloudinary.uploader.rename(publicId, newPublicId);
    return newPublicId;
  } catch (error) {
    console.error(`Error moving image ${publicId} to used folder:`, error);
    throw error;
  }
}

/**
 * Upload an image to Cloudinary
 * @param {Buffer} imageBuffer Image data
 * @param {string} folder Destination folder
 * @param {string} filename Filename without extension
 * @returns {Promise<Object>} Upload result with secure_url
 */
async function uploadImage(imageBuffer, folder, filename) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        public_id: filename,
        format: 'webp',
        transformation: [{ quality: 'auto:best' }]
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    uploadStream.end(imageBuffer);
  });
}

module.exports = {
  getOldestUnusedImages,
  moveToUsed,
  uploadImage
}; 