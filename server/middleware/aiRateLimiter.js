const rateLimitStore = new Map();

const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 10;

const aiRateLimiter = (req, res, next) => {
    const userId = req.user?._id?.toString();

    if (!userId) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }

    const now = Date.now();
    const userLimit = rateLimitStore.get(userId);

    // First request or expired window
    if (!userLimit || now - userLimit.startTime >= WINDOW_MS) {
        rateLimitStore.set(userId, {
            count: 1,
            startTime: now
        });

        return next();
    }

    // Rate limit exceeded
    if (userLimit.count >= MAX_REQUESTS) {
        const retryAfter = Math.ceil(
            (WINDOW_MS - (now - userLimit.startTime)) / 1000
        );

        res.set('Retry-After', String(retryAfter));

        return res.status(429).json({
            success: false,
            message: 'Too many AI requests. Please try again later.'
        });
    }

    // Increment request count
    userLimit.count += 1;

    return next();
};

module.exports = {
    aiRateLimiter
};