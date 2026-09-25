const getRateLimitInfo = (error) => {
    const headers = error?.headers;

    if (!headers) {
        return null;
    }

    const getHeader = (name) => {
        if (typeof headers.get === "function") {
            return headers.get(name);
        }

        return headers[name] || headers[name.toLowerCase()];
    };

    const retryAfter = getHeader("retry-after");

    const resetRequests =
        getHeader("x-ratelimit-reset-requests");

    return {
        retryAfter: retryAfter || null,
        resetRequests: resetRequests || null
    };
};

module.exports = {
    getRateLimitInfo
};