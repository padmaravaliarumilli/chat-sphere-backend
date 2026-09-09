const {
    groq,
    GROQ_MODEL,
    GROQ_TIMEOUT_MS,
    GROQ_MAX_OUTPUT_TOKENS
} = require('../../config/ai');

const AIError = require('../../utils/aiError');

const ALLOWED_ROLES = ['system', 'user', 'assistant'];

const DEFAULT_TEMPERATURE = 0.7;

const DEFAULT_MAX_TOKENS = 1000;
const MIN_MAX_TOKENS = 1;
const MAX_MAX_TOKENS = GROQ_MAX_OUTPUT_TOKENS;

const MAX_MESSAGES = 50;
const MAX_MESSAGE_LENGTH = 10000;
const MAX_TOTAL_MESSAGE_LENGTH = 30000;

const validateMessages = (messages) => {
    if (!Array.isArray(messages)) {
        throw new Error('Messages must be an array');
    }

    if (messages.length === 0) {
        throw new Error('At least one message is required');
    }

    if (messages.length > MAX_MESSAGES) {
        throw new Error(
            `Maximum ${MAX_MESSAGES} messages are allowed`
        );
    }

    let totalMessageLength = 0;

    messages.forEach((message, index) => {
        if (!message || typeof message !== 'object') {
            throw new Error(
                `Message at index ${index} must be an object`
            );
        }

        if (!ALLOWED_ROLES.includes(message.role)) {
            throw new Error(
                `Invalid role at message index ${index}`
            );
        }

        if (
            typeof message.content !== 'string' ||
            message.content.trim().length === 0
        ) {
            throw new Error(
                `Message content at index ${index} is required`
            );
        }

        if (message.content.length > MAX_MESSAGE_LENGTH) {
            throw new Error(
                `Message at index ${index} exceeds the maximum allowed length`
            );
        }

        totalMessageLength += message.content.length;
    });

    if (totalMessageLength > MAX_TOTAL_MESSAGE_LENGTH) {
        throw new Error(
            `Total message content cannot exceed ${MAX_TOTAL_MESSAGE_LENGTH} characters`
        );
    }
};

const validateModel = (model) => {
    if (
        typeof model !== 'string' ||
        model.trim().length === 0
    ) {
        throw new Error('Model must be a non-empty string');
    }
};

const validateTemperature = (temperature) => {
    if (
        typeof temperature !== 'number' ||
        Number.isNaN(temperature)
    ) {
        throw new Error('Temperature must be a valid number');
    }

    if (temperature < 0 || temperature > 2) {
        throw new Error(
            'Temperature must be between 0 and 2'
        );
    }
};

const validateMaxTokens = (maxTokens) => {
    if (!Number.isInteger(maxTokens)) {
        throw new Error('maxTokens must be an integer');
    }

    if (maxTokens < MIN_MAX_TOKENS) {
        throw new Error(
            `maxTokens must be at least ${MIN_MAX_TOKENS}`
        );
    }

    if (maxTokens > MAX_MAX_TOKENS) {
        throw new Error(
            `maxTokens cannot exceed ${MAX_MAX_TOKENS}`
        );
    }
};

const generateCompletion = async ({
    messages,
    model = GROQ_MODEL,
    temperature = DEFAULT_TEMPERATURE,
    maxTokens = DEFAULT_MAX_TOKENS
}) => {
    validateMessages(messages);
    validateModel(model);
    validateTemperature(temperature);
    validateMaxTokens(maxTokens);

    const controller = new AbortController();

    const timeout = setTimeout(() => {
        controller.abort();
    }, GROQ_TIMEOUT_MS);

    try {
        const completion =
            await groq.chat.completions.create(
                {
                    model,
                    messages,
                    temperature,
                    max_tokens: maxTokens
                },
                {
                    signal: controller.signal
                }
            );

        const content =
            completion.choices?.[0]?.message?.content;

        if (
            typeof content !== 'string' ||
            content.trim().length === 0
        ) {
            throw new AIError(
                'Groq returned an empty response',
                502,
                'EMPTY_AI_RESPONSE'
            );
        }

        return {
            content: content.trim(),
            model: completion.model,
            usage: completion.usage
        };

    } catch (error) {
        console.error(
            '========== GROQ API ERROR =========='
        );

        console.error(
            'Status:',
            error?.status || 'N/A'
        );

        console.error(
            'Code:',
            error?.code || 'N/A'
        );

        console.error(
            'Message:',
            error?.message || 'Unknown error'
        );

        console.error(
            'Model:',
            model
        );

        console.error(
            'Timeout:',
            `${GROQ_TIMEOUT_MS}ms`
        );

        if (error?.status === 429) {
            console.error(
                'Groq rate limit reached'
            );

            console.error(
                'Retry-After:',
                error?.headers?.get?.(
                    'retry-after'
                ) || 'N/A'
            );

            console.error(
                'Remaining Requests:',
                error?.headers?.get?.(
                    'x-ratelimit-remaining-requests'
                ) || 'N/A'
            );
        }

        console.error(
            '===================================='
        );

        throw error;

    } finally {
        clearTimeout(timeout);
    }
};

const getAvailableModels = async () => {

    try {

        const models = await groq.models.list();

        return models.data;

    } catch (error) {

        console.error(
            '========== GROQ MODELS ERROR =========='
        );

        console.error('Status:', error?.status || 'N/A');
        console.error('Code:', error?.code || 'N/A');
        console.error('Message:', error?.message || 'Unknown error');

        console.error(
            '========================================'
        );

        throw error;
    }
};

module.exports = {
    generateCompletion,
    getAvailableModels
};