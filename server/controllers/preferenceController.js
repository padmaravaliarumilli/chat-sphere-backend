const updatePreferences = async (req, res) => {
    try {
        const { theme, preferredLanguage } = req.body;

        const user = req.user;

        if (theme) {
            user.theme = theme;
        }

        if (preferredLanguage) {
            user.preferredLanguage = preferredLanguage;
        }

        await user.save();

        res.status(200).json({
            message: 'Preferences updated successfully',
            preferences: {
                theme: user.theme,
                preferredLanguage: user.preferredLanguage,
            },
        });
    } catch (error) {
        res.status(500).json({
            message: error.message,
        });
    }
};

module.exports = {
    updatePreferences,
};
