import axios from 'axios'; // If you're using Axios for API calls

// Fetch today's puzzle image pairs from the backend
const fetchImagePairsForToday = async () => {
  try {
    const response = await fetch('/api/game/daily-puzzle');
    if (!response.ok) {
      throw new Error('Failed to fetch today\'s image pairs');
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching today\'s image pairs:', error);
    throw error;
  }
};

export default fetchImagePairsForToday; // If placed in a separate file
