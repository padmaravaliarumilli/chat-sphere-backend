const { generateCompletion, getAvailableModels } = require('../services/ai/groqService');
const { handleGroqError } = require('../utils/aiErrorHandler');
const { summarizeText, generateSmartReplies, explainText } = require('../services/ai/aiServices');

const testGroq = async (req, res) => {
    try {
        const result = await generateCompletion({
            messages: [
                {
                    role: 'system',
                    content: 'You are a helpful assistant.',
                },
                {
                    role: 'user',
                    content: 'Explain what Chat Sphere is in one sentence.',
                },
            ],
            temperature: 0.3,
            maxTokens: 100,
        });

        return res.status(200).json({
            success: true,
            message: 'Groq API is working',
            data: result,
        });
    } catch (error) {
        if (
            error.message?.includes('Messages') ||
            error.message?.includes('message') ||
            error.message?.includes('Temperature') ||
            error.message?.includes('temperature') ||
            error.message?.includes('maxTokens') ||
            error.message?.includes('Model')
        ) {
            return res.status(400).json({
                success: false,
                message: error.message,
            });
        }

        const handledError = handleGroqError(error);

        if (handledError.statusCode === 429 && handledError.rateLimitInfo?.retryAfter) {
            res.set('Retry-After', handledError.rateLimitInfo.retryAfter);
        }

        return res.status(handledError.statusCode).json({
            success: false,
            message: handledError.message,
        });
    }
};

const testGroqModels = async (req, res) => {
    try {
        const models = await getAvailableModels();

        res.status(200).json({
            success: true,
            message: 'Groq models fetched successfully',
            data: models,
        });
    } catch (error) {
        console.error('Groq Models Error:', error);

        res.status(500).json({
            success: false,
            message: 'Failed to fetch Groq models',
        });
    }
};

const summarize = async (req, res) => {
    try {
        const { text } = req.body;

        if (typeof text !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Text is required and must be a string',
            });
        }

        const trimmedText = text.trim();

        if (!trimmedText) {
            return res.status(400).json({
                success: false,
                message: 'Text cannot be empty',
            });
        }

        if (trimmedText.length > 5000) {
            return res.status(400).json({
                success: false,
                message: 'Text cannot exceed 5000 characters',
            });
        }

        const result = await summarizeText(trimmedText);

        return res.status(200).json({
            success: true,
            message: 'Text summarized successfully',
            data: {
                summary: result.content,
                model: result.model,
                usage: result.usage,
            },
        });
    } catch (error) {
        console.error('Summarize Error:', error);

        const handledError = handleGroqError(error);

        if (handledError.statusCode === 429 && handledError.rateLimitInfo?.retryAfter) {
            res.set('Retry-After', handledError.rateLimitInfo.retryAfter);
        }

        return res.status(handledError.statusCode).json({
            success: false,
            message: handledError.message,
        });
    }
};

const explain = async (req, res) => {
    try {
        const { text } = req.body;

        // Text validation
        if (typeof text !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Text is required and must be a string',
            });
        }

        // Empty text protection
        const trimmedText = text.trim();

        if (!trimmedText) {
            return res.status(400).json({
                success: false,
                message: 'Text cannot be empty',
            });
        }

        // Maximum text length
        if (trimmedText.length > 5000) {
            return res.status(400).json({
                success: false,
                message: 'Text cannot exceed 5000 characters',
            });
        }

        // Generate explanation
        const result = await explainText(trimmedText);

        return res.status(200).json({
            success: true,
            message: 'Text explained successfully',
            data: {
                explanation: result.content,
                model: result.model,
                usage: result.usage,
                fallback: result.fallback,
            },
        });
    } catch (error) {
        console.error('Explain Error:', error);

        const handledError = handleGroqError(error);

        // Rate-limit handling
        if (handledError.statusCode === 429 && handledError.rateLimitInfo?.retryAfter) {
            res.set('Retry-After', String(handledError.rateLimitInfo.retryAfter));
        }

        return res.status(handledError.statusCode).json({
            success: false,
            message: handledError.message,
        });
    }
};

const smartReply = async (req, res) => {
    try {
        const { message } = req.body;

        // Message validation
        if (typeof message !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Message is required and must be a string',
            });
        }

        // Empty message protection
        const trimmedMessage = message.trim();

        if (!trimmedMessage) {
            return res.status(400).json({
                success: false,
                message: 'Message cannot be empty',
            });
        }

        // Maximum message length
        if (trimmedMessage.length > 500) {
            return res.status(400).json({
                success: false,
                message: 'Message cannot exceed 500 characters',
            });
        }

        // Generate smart replies
        const result = await generateSmartReplies(trimmedMessage);

        return res.status(200).json({
            success: true,
            message: 'Smart replies generated successfully',
            data: result,
        });
    } catch (error) {
        console.error('Smart Reply Error:', error);

        const handledError = handleGroqError(error);

        // Rate-limit handling
        if (handledError.statusCode === 429 && handledError.rateLimitInfo?.retryAfter) {
            res.set('Retry-After', String(handledError.rateLimitInfo.retryAfter));
        }

        return res.status(handledError.statusCode).json({
            success: false,
            message: handledError.message,
        });
    }
};

module.exports = {
    testGroq,
    testGroqModels,
    summarize,
    explain,
    smartReply,
};
