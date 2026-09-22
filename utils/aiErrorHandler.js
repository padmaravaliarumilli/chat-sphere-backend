const { getRateLimitInfo } = require('./aiRateLimit');

const handleGroqError = (error) => {
    const status = error?.status;

    // Known application-level AI errors
    if (error?.name === 'AIError') {
        const statusCode = Number.isInteger(error.statusCode)
            ? error.statusCode
            : 500;

        const safeMessages = {
            400: 'Invalid AI request',
            401: 'AI service authentication failed',
            403: 'AI service access denied',
            404: 'Configured AI model is unavailable',
            408: 'AI service request timed out',
            429: 'AI service rate limit exceeded. Please try again later.',
            500: 'Unexpected AI service error',
            503: 'AI service is temporarily unavailable',
            504: 'AI service request timed out'
        };

        return {
            statusCode,
            message: safeMessages[statusCode] || 'Unexpected AI service error'
        };
    }

    // Timeout / aborted requests
    if (
        error?.name === 'AbortError' ||
        error?.code === 'ETIMEDOUT' ||
        error?.code === 'ECONNABORTED' ||
        error?.code === 'UND_ERR_ABORTED'
    ) {
        return {
            statusCode: 504,
            message: 'AI service request timed out'
        };
    }

    switch (status) {
        case 400:
            return {
                statusCode: 400,
                message: 'Invalid AI request'
            };

        case 401:
            return {
                statusCode: 500,
                message: 'AI service authentication failed'
            };

        case 403:
            return {
                statusCode: 500,
                message: 'AI service access denied'
            };

        case 404:
            return {
                statusCode: 500,
                message: 'Configured AI model is unavailable'
            };

        case 429: {
            const rateLimitInfo = getRateLimitInfo(error);

            return {
                statusCode: 429,
                message: 'AI service rate limit exceeded. Please try again later.',
                rateLimitInfo
            };
        }

        case 500:
        case 502:
        case 503:
        case 504:
            return {
                statusCode: 503,
                message: 'AI service is temporarily unavailable'
            };

        default:
            if (
                error?.code === 'ECONNRESET' ||
                error?.code === 'ECONNREFUSED' ||
                error?.code === 'ENOTFOUND'
            ) {
                return {
                    statusCode: 503,
                    message: 'Unable to connect to AI service'
                };
            }

            return {
                statusCode: 500,
                message: 'Unexpected AI service error'
            };
    }
};

module.exports = {
    handleGroqError
};