const Groq = require('groq-sdk');

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL;
const GROQ_TIMEOUT_MS = Number(
    process.env.GROQ_TIMEOUT_MS
);
const GROQ_MAX_OUTPUT_TOKENS = Number(
    process.env.GROQ_MAX_OUTPUT_TOKENS
);

const validateAIConfig = () => {
    if (!GROQ_API_KEY) {
        throw new Error(
            'GROQ_API_KEY is not configured'
        );
    }

    if (
        typeof GROQ_MODEL !== 'string' ||
        GROQ_MODEL.trim().length === 0
    ) {
        throw new Error(
            'GROQ_MODEL is not configured'
        );
    }

    if (
        !Number.isInteger(GROQ_TIMEOUT_MS) ||
        GROQ_TIMEOUT_MS < 1000 ||
        GROQ_TIMEOUT_MS > 120000
    ) {
        throw new Error(
            'GROQ_TIMEOUT_MS must be between 1000 and 120000 milliseconds'
        );
    }

    if (
        !Number.isInteger(GROQ_MAX_OUTPUT_TOKENS) ||
        GROQ_MAX_OUTPUT_TOKENS < 1 ||
        GROQ_MAX_OUTPUT_TOKENS > 2000
    ) {
        throw new Error(
            'GROQ_MAX_OUTPUT_TOKENS must be between 1 and 2000'
        );
    }
};

validateAIConfig();

const groq = new Groq({
    apiKey: GROQ_API_KEY
});

module.exports = {
    groq,
    GROQ_MODEL,
    GROQ_TIMEOUT_MS,
    GROQ_MAX_OUTPUT_TOKENS
};