exports.getDailyPuzzle = async (req, res) => {
    try {
      const today = new Date();
      const day = today.getUTCDate();
      const month = today.getUTCMonth() + 1; // Month is zero-based in JavaScript
      const year = today.getUTCFullYear();
      const dateString = `${year}-${month}-${day}`;
  
      // Find the puzzle based on the dateString
      const dailyPuzzle = await Puzzle.findOne({ date: dateString });
  
      if (dailyPuzzle) {
        res.status(200).json(dailyPuzzle);
      } else {
        res.status(404).json({ message: 'Daily puzzle not found' });
      }
    } catch (error) {
      console.error('Error fetching daily puzzle:', error);
      res.status(500).json({ message: 'Server error' });
    }
  };