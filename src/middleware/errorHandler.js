const { AppError } = require('../utils/errors');

// Express recognises a middleware as an error handler ONLY when its signature
// has 4 args. The unused _next parameter must remain to satisfy this contract.
const errorHandler = (err, _req, res, _next) => {

    // Operational errors raised intentionally (NotFound, Validation, Conflict, etc.)
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            message: err.message,
            ...(err.details && err.details.length > 0 ? { errors: err.details } : {}),
        });
    }

    // Body-parser SyntaxError on malformed JSON
    if (err.type === 'entity.parse.failed' || err instanceof SyntaxError) {
        return res.status(400).json({
            message: 'Request body contains invalid JSON',
        });
    }

    // Unknown or programmer error: log full details server-side, return generic 500.
    console.error('[errorHandler] Unhandled error:', err);
    return res.status(500).json({
        message:
            process.env.NODE_ENV === 'development'
                ? err.message || 'Internal Server Error'
                : 'Internal Server Error',
    });
};

// 404 fallback for unmatched routes. Mount AFTER all routes, BEFORE errorHandler.
const notFoundHandler = (req, res) => {
    return res.status(404).json({
        message: `Cannot ${req.method} ${req.originalUrl}`,
    });
};

module.exports = {
    errorHandler,
    notFoundHandler,
};
