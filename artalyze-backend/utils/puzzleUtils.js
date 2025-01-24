const ImagePair = require('../models/ImagePair');
const { getTodayInEST } = require('./dateUtils'); // Ensure dateUtils exists

// Function to generate image pairs for the day
const generateImagePairs = async () => {
    const nowUTC = new Date();
    const startOfDayUTC = new Date(nowUTC);
    startOfDayUTC.setUTCHours(5, 0, 0, 0);
    const endOfDayUTC = new Date(startOfDayUTC);
    endOfDayUTC.setUTCHours(28, 59, 59, 999);
  
    const dailyPuzzle = await ImagePair.findOne({
      scheduledDate: { $gte: startOfDayUTC, $lte: endOfDayUTC },
      status: 'live',
    });
  
    if (!dailyPuzzle) {
      throw new Error('No daily puzzle available for today.');
    }
  
    return dailyPuzzle.pairs || [];
  };
  
