const {
    translateText
} = require('../services/ai/translationService');

const translate = async (req, res) => {

    try {

        const {
            text,
            source = 'auto',
            target
        } = req.body;

        if (!text) {
            return res.status(400).json({
                message: 'Text is required'
            });
        }

        if (!target) {
            return res.status(400).json({
                message: 'Target language is required'
            });
        }

        const result = await translateText({
            text,
            source,
            target
        });

        return res.status(200).json({
            message: 'Translation successful',
            data: result
        });

    } catch (error) {

        console.error(
            'Translation Controller Error:',
            error.message
        );

        return res.status(500).json({
            message: error.message
        });
    }
};

module.exports = {
    translate
};