const User = require('../models/User');

exports.getThemePreference = async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        res.json({ themePreference: user.themePreference });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching theme preference' });
    }
};

exports.updateThemePreference = async (req, res) => {
    try {
        console.log("🔍 Received theme update request");
        console.log("🔑 User ID from req.user:", req.user);

        const { themePreference } = req.body;
        console.log("🎨 Theme preference received:", themePreference);

        if (!['light', 'dark'].includes(themePreference)) {
            console.log("❌ Invalid theme preference received:", themePreference);
            return res.status(400).json({ message: 'Invalid theme preference' });
        }

        if (!req.user || !req.user.userId) {
            console.log("❌ No user ID found in request.");
            return res.status(401).json({ message: 'Unauthorized: No user ID found' });
        }

        const user = await User.findByIdAndUpdate(req.user.userId, { themePreference }, { new: true });

        if (!user) {
            console.log("❌ User not found in database.");
            return res.status(404).json({ message: 'User not found' });
        }

        console.log("✅ Theme preference updated successfully:", user.themePreference);
        res.json({ themePreference: user.themePreference });
    } catch (error) {
        console.error("🔥 Error updating theme preference:", error);
        res.status(500).json({ message: 'Error updating theme preference' });
    }
};