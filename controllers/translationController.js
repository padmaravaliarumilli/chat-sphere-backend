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

        // ================================================
        // VALIDATION
        // ================================================

        if (
            !text ||
            typeof text !== 'string' ||
            !text.trim()
        ) {
            return res.status(400).json({
                message: 'Text is required'
            });
        }

        if (
            !target ||
            typeof target !== 'string' ||
            !target.trim()
        ) {
            return res.status(400).json({
                message: 'Target language is required'
            });
        }

        // ================================================
        // TRANSLATE
        // ================================================

        const result = await translateText(
            text,
            source,
            target
        );

        // ================================================
        // SUCCESS
        // ================================================

        return res.status(200).json({
            message: 'Translation successful',
            data: result
        });

    } catch (error) {

        console.error(
            'Translation Controller Error:',
            error.message
        );

        // ================================================
        // CLIENT ERRORS
        // ================================================

        if (
            error.message.includes('required') ||
            error.message.includes('Invalid')
        ) {
            return res.status(400).json({
                message: error.message
            });
        }

        // ================================================
        // RATE LIMIT
        // ================================================

        if (
            error.message.includes('rate limit')
        ) {
            return res.status(429).json({
                message: error.message
            });
        }

        // ================================================
        // TIMEOUT
        // ================================================

        if (
            error.message.includes('timed out')
        ) {
            return res.status(504).json({
                message: error.message
            });
        }

        // ================================================
        // SERVICE UNAVAILABLE
        // ================================================

        if (
            error.message.includes(
                'Translation service is unavailable'
            )
        ) {
            return res.status(503).json({
                message: error.message
            });
        }

        // ================================================
        // OTHER TRANSLATION ERRORS
        // ================================================

        return res.status(502).json({
            message: error.message ||
                'Translation service failed'
        });
    }
};

module.exports = {
    translate
};