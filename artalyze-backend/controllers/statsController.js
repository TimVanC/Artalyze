const Stats = require('../models/Stats');

// Fetch user statistics
exports.getUserStats = async (req, res) => {
    const { userId } = req.params;

    if (!userId) {
        return res.status(400).json({ message: 'User ID is required.' });
    }

    try {
        const stats = await Stats.findOne({ userId });
        if (!stats) {
            return res.status(404).json({ message: 'Statistics not found for this user.' });
        }

        res.status(200).json(stats);
    } catch (error) {
        console.error('Error fetching user stats:', error);
        res.status(500).json({ message: 'Server error while fetching statistics.' });
    }
};


// Update user statistics
exports.updateUserStats = async (req, res) => {
    try {
      const { userId } = req.params;
      console.log('Received request to update stats for userId:', userId, 'With data:', req.body);
  
      const updatedStats = await Stats.findOneAndUpdate(
        { userId },
        { $set: req.body },
        { new: true, upsert: true }
      );
  
      console.log('Updated stats in DB:', updatedStats);
      res.status(200).json({ message: 'Stats updated successfully', stats: updatedStats });
    } catch (error) {
      console.error('Error updating stats:', error);
      res.status(500).json({ message: 'Failed to update stats' });
    }
  };
  

