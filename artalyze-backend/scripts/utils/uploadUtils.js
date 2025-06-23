const { uploadImage, moveToUsed } = require('./cloudinaryUtils');

/**
 * Process and upload both human and AI images
 * @param {Object} params Upload parameters
 * @param {string} params.date Date string YYYY-MM-DD
 * @param {number} params.index Pair index (1-5)
 * @param {Object} params.humanImage Human image object
 * @param {Buffer} params.aiImage AI image buffer
 * @returns {Promise<Object>} URLs of uploaded images
 */
async function processAndUploadImages({ date, index, humanImage, aiImage }) {
  try {
    // Create folder path for this date's puzzle
    const puzzleFolder = `artalyze/puzzles/${date}`;

    // Upload AI image to puzzle folder
    const aiResult = await uploadImage(
      aiImage,
      puzzleFolder,
      `Ai${index}`
    );

    // Move human image to used folder
    await moveToUsed(humanImage.publicId);

    // Return both URLs
    return {
      humanUrl: humanImage.url,
      aiUrl: aiResult.secure_url
    };

  } catch (error) {
    console.error('Error processing and uploading images:', error);
    throw error;
  }
}

module.exports = {
  processAndUploadImages
}; 