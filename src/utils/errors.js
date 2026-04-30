class AppError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        Error.captureStackTrace?.(this, this.constructor);
    }
}

class NotFoundError extends AppError {
    constructor(resource = 'Resource', id = '') {
        const suffix = id ? ` with id '${id}'` : '';
        super(`${resource}${suffix} not found`, 404);
    }
}

class ValidationError extends AppError {
    constructor(message = 'Validation failed', details = []) {
        super(message, 400);
        this.details = details;
    }
}

module.exports = {
    AppError,
    NotFoundError,
    ValidationError,
};
