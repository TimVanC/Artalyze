const Replicate = require('replicate');

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

/**
 * Generate a caption for an image using BLIP-2
 * @param {string} imageUrl URL of the image to caption
 * @returns {Promise<string>} Generated caption
 */
async function captionImage(imageUrl) {
  try {
    const output = await replicate.run(
      "salesforce/blip-2:4b32258c42e9efd4288bb9910bc532a69727f9acd26aa08e175713a0a857a608",
      {
        input: {
          image: imageUrl,
          task: "image_to_text",
          use_nucleus_sampling: true,
          temperature: 1,
          top_p: 0.9
        }
      }
    );

    // BLIP-2 returns an array with a single string
    const caption = output[0];
    
    // Clean up the caption
    return caption
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  } catch (error) {
    console.error('Error generating caption:', error);
    throw error;
  }
}

module.exports = {
  captionImage
}; 