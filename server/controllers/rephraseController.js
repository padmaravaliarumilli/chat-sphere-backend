const { rephraseText } = require('../services/ai/aiServices');
const { handleGroqError } = require('../utils/aiErrorHandler');

const rephrase = async (req, res) => {
    try {
        const { text } = req.body;

        // Text validation
        if (typeof text !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Text is required and must be a string'
            });
        }

        // Empty text protection
        const trimmedText = text.trim();

        if (!trimmedText) {
            return res.status(400).json({
                success: false,
                message: 'Text cannot be empty'
            });
        }

        // Maximum text length
        if (trimmedText.length > 5000) {
            return res.status(400).json({
                success: false,
                message: 'Text cannot exceed 5000 characters'
            });
        }

        // Generate rephrased text
        const result = await rephraseText(trimmedText);

        return res.status(200).json({
            success: true,
            message: 'Text rephrased successfully',
            data: {
                rephrasedText: result.content,
                model: result.model,
                usage: result.usage,
                fallback: result.fallback
            }
        });

    } catch (error) {
        console.error('Rephrase Error:', error);

        const handledError = handleGroqError(error);

        // Rate-limit handling
        if (
            handledError.statusCode === 429 &&
            handledError.rateLimitInfo?.retryAfter
        ) {
            res.set(
                'Retry-After',
                String(handledError.rateLimitInfo.retryAfter)
            );
        }

        return res.status(handledError.statusCode).json({
            success: false,
            message: handledError.message
        });
    }
};

module.exports = {
    rephrase
};