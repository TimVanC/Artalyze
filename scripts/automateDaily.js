require('dotenv').config();
const { getOldestUnusedImages } = require('./utils/cloudinaryUtils');
const { captionImage } = require('./utils/captionUtils');
const { generateAiPrompt } = require('./utils/promptUtils');
const { generateAiImage } = require('./utils/imageGenUtils');
const { processAndUploadImages } = require('./utils/uploadUtils');
const { updateMongoDB } = require('./utils/dbUtils');
const { formatDate } = require('./utils/dateUtils');

async function automateDaily() {
  try {
    console.log('Starting daily automation process...');
    
    // 1. Get the 5 oldest unused human images
    const humanImages = await getOldestUnusedImages(5);
    if (humanImages.length === 0) {
      console.log('No unused human images found. Exiting...');
      return;
    }

    // Get today's date for folder organization
    const today = formatDate(new Date());
    const results = [];

    // 2. Process each image pair
    for (let i = 0; i < humanImages.length; i++) {
      const humanImage = humanImages[i];
      console.log(`Processing image pair ${i + 1} of ${humanImages.length}`);

      try {
        // Generate caption for human image
        const caption = await captionImage(humanImage.url);
        console.log(`Caption generated: ${caption}`);

        // Generate creative AI prompt from caption
        const aiPrompt = await generateAiPrompt(caption);
        console.log(`AI prompt generated: ${aiPrompt}`);

        // Generate AI image matching dimensions
        const aiImage = await generateAiImage(aiPrompt, {
          width: humanImage.width,
          height: humanImage.height
        });

        // Upload both images to dated folder and move human image to used
        const { humanUrl, aiUrl } = await processAndUploadImages({
          date: today,
          index: i + 1,
          humanImage: humanImage,
          aiImage: aiImage
        });

        results.push({
          humanImageURL: humanUrl,
          aiImageURL: aiUrl
        });

      } catch (error) {
        console.error(`Error processing pair ${i + 1}:`, error);
        // Continue with next pair if one fails
        continue;
      }
    }

    // 3. Store results in MongoDB
    if (results.length > 0) {
      await updateMongoDB({
        scheduledDate: new Date(today),
        pairs: results
      });
      console.log('Successfully stored image pairs in MongoDB');
    }

    console.log('Daily automation completed successfully');

  } catch (error) {
    console.error('Error in automation process:', error);
    throw error;
  }
}

// Run if called directly (not imported)
if (require.main === module) {
  automateDaily()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = automateDaily; 