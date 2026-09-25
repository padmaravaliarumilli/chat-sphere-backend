class AIError extends Error {
    constructor(message, statusCode = 500, code = 'AI_ERROR') {
        super(message);

        this.name = 'AIError';
        this.statusCode = statusCode;
        this.code = code;
    }
}

module.exports = AIError;

