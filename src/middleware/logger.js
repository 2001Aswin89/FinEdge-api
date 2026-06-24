// Logs every incoming request on entry and the final status + duration on exit.
// Mount before body parsers so requests that fail at parsing are still logged.

const logger = (req, res, next) => {
    const start = Date.now();
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] --> ${req.method} ${req.originalUrl}`);

    res.on('finish', () => {
        const duration = Date.now() - start;
        const finishedAt = new Date().toISOString();
        console.log(
            `[${finishedAt}] <-- ${req.method} ${req.originalUrl} ${res.statusCode} (${duration}ms)`
        );
    });

    next();
};

module.exports = logger;
