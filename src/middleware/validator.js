// Hand-rolled input validators for transaction and budget endpoints.
// On failure, throws ValidationError with a `details` array, which the global
// error handler renders as a 400 response with structured field-level errors.

const { ValidationError } = require('../utils/errors');

const ALLOWED_TYPES = ['income', 'expense'];

// Allowed body keys for transaction create/update. Unknown keys reject with 400.
const ALLOWED_TX_BODY_KEYS = new Set([
    'type',
    'category',
    'amount',
    'date',
    'description',
]);

// Allowed query keys for GET /transactions.
const ALLOWED_TX_FILTER_KEYS = new Set([
    'type',
    'category',
    'startDate',
    'endDate',
    'userId',
]);

// Allowed query keys for GET /summary. Same as transaction filters minus `type`
// (summary aggregates both income and expense).
const ALLOWED_SUMMARY_FILTER_KEYS = new Set([
    'category',
    'startDate',
    'endDate',
    'userId',
]);

// Allowed body keys for budget create.
const ALLOWED_BUDGET_CREATE_KEYS = new Set([
    'userId',
    'month',
    'monthlyGoal',
    'savingsTarget',
]);

// Allowed body keys for budget PATCH. userId is excluded so identity cannot
// be reassigned through PATCH (same protection as transactions).
const ALLOWED_BUDGET_UPDATE_KEYS = new Set([
    'month',
    'monthlyGoal',
    'savingsTarget',
]);

// Allowed query keys for GET /budgets.
const ALLOWED_BUDGET_FILTER_KEYS = new Set(['userId', 'month']);

// YYYY-MM-DD with an optional full ISO timestamp suffix (T...).
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}(T.+)?$/;

// YYYY-MM (no day component) used by Budget records.
const MONTH_REGEX = /^\d{4}-(0[1-9]|1[0-2])$/;

/* ------------------------------ helpers ------------------------------ */

const isNonEmptyString = (value) =>
    typeof value === 'string' && value.trim().length > 0;

const isValidISODate = (value) => {
    if (typeof value !== 'string' || !ISO_DATE_REGEX.test(value)) return false;
    const d = new Date(value);
    return !Number.isNaN(d.getTime());
};

const isValidMonth = (value) =>
    typeof value === 'string' && MONTH_REGEX.test(value);

const isPositiveNumber = (value) =>
    typeof value === 'number' && Number.isFinite(value) && value > 0;

const isNonNegativeNumber = (value) =>
    typeof value === 'number' && Number.isFinite(value) && value >= 0;

// Returns error entries for any body key not in the allowed set.
const unknownKeyErrors = (body, allowed) =>
    Object.keys(body)
        .filter((k) => !allowed.has(k))
        .map((k) => ({
            field: k,
            message: `unknown field. Allowed: ${[...allowed].join(', ')}`,
        }));

/* ----------------------- transaction validators ----------------------- */

// Strict validator for POST /transactions. Every required field must be present,
// and unknown fields are rejected.
const validateTransactionCreate = (req, _res, next) => {
    const body = req.body || {};
    const { type, category, amount, date, description } = body;
    const errors = [];

    if (!ALLOWED_TYPES.includes(type)) {
        errors.push({
            field: 'type',
            message: `must be one of: ${ALLOWED_TYPES.join(', ')}`,
        });
    }
    if (!isNonEmptyString(category)) {
        errors.push({ field: 'category', message: 'must be a non-empty string' });
    }
    if (!isPositiveNumber(amount)) {
        errors.push({ field: 'amount', message: 'must be a positive number' });
    }
    if (!isValidISODate(date)) {
        errors.push({
            field: 'date',
            message: 'must be a valid ISO date (YYYY-MM-DD or full ISO timestamp)',
        });
    }
    if (description !== undefined && typeof description !== 'string') {
        errors.push({
            field: 'description',
            message: 'must be a string when provided',
        });
    }

    errors.push(...unknownKeyErrors(body, ALLOWED_TX_BODY_KEYS));

    if (errors.length > 0) {
        return next(new ValidationError('Invalid transaction payload', errors));
    }
    next();
};

// Loose validator for PATCH /transactions/:id. Fields are optional but must be
// valid when present. At least one allowed field must be supplied. Unknown keys
// (id, userId, createdAt, junk) are rejected so identity cannot be mutated.
const validateTransactionUpdate = (req, _res, next) => {
    const body = req.body || {};
    const errors = [];

    if (Object.keys(body).length === 0) {
        return next(new ValidationError('Update body cannot be empty', []));
    }

    if (body.type !== undefined && !ALLOWED_TYPES.includes(body.type)) {
        errors.push({
            field: 'type',
            message: `must be one of: ${ALLOWED_TYPES.join(', ')}`,
        });
    }
    if (body.category !== undefined && !isNonEmptyString(body.category)) {
        errors.push({ field: 'category', message: 'must be a non-empty string' });
    }
    if (body.amount !== undefined && !isPositiveNumber(body.amount)) {
        errors.push({ field: 'amount', message: 'must be a positive number' });
    }
    if (body.date !== undefined && !isValidISODate(body.date)) {
        errors.push({
            field: 'date',
            message: 'must be a valid ISO date (YYYY-MM-DD or full ISO timestamp)',
        });
    }
    if (body.description !== undefined && typeof body.description !== 'string') {
        errors.push({ field: 'description', message: 'must be a string' });
    }

    errors.push(...unknownKeyErrors(body, ALLOWED_TX_BODY_KEYS));

    if (errors.length > 0) {
        return next(new ValidationError('Invalid transaction update payload', errors));
    }
    next();
};

// Validator for GET /transactions query string.
// Rejects unknown filter keys and malformed type/date values up front, instead of
// silently returning an empty array. Empty-string values (e.g. ?type=&startDate=)
// are treated as absent to match how UIs send cleared filters.
const validateTransactionFilters = (req, _res, next) => {
    const q = req.query || {};
    const errors = [];

    for (const key of Object.keys(q)) {
        if (!ALLOWED_TX_FILTER_KEYS.has(key)) {
            errors.push({
                field: key,
                message: `unknown filter. Allowed: ${[...ALLOWED_TX_FILTER_KEYS].join(', ')}`,
            });
        }
    }

    if (q.type !== undefined && q.type !== '' && !ALLOWED_TYPES.includes(q.type)) {
        errors.push({
            field: 'type',
            message: `must be one of: ${ALLOWED_TYPES.join(', ')}`,
        });
    }
    if (q.startDate !== undefined && q.startDate !== '' && !isValidISODate(q.startDate)) {
        errors.push({ field: 'startDate', message: 'must be a valid ISO date' });
    }
    if (q.endDate !== undefined && q.endDate !== '' && !isValidISODate(q.endDate)) {
        errors.push({ field: 'endDate', message: 'must be a valid ISO date' });
    }

    if (errors.length > 0) {
        return next(new ValidationError('Invalid query parameters', errors));
    }
    next();
};

// Validator for GET /summary query string.
// Same shape as transaction filters minus `type` (summary aggregates both).
// Empty-string values are treated as absent.
const validateSummaryFilters = (req, _res, next) => {
    const q = req.query || {};
    const errors = [];

    for (const key of Object.keys(q)) {
        if (!ALLOWED_SUMMARY_FILTER_KEYS.has(key)) {
            errors.push({
                field: key,
                message: `unknown filter. Allowed: ${[...ALLOWED_SUMMARY_FILTER_KEYS].join(', ')}`,
            });
        }
    }

    if (q.startDate !== undefined && q.startDate !== '' && !isValidISODate(q.startDate)) {
        errors.push({ field: 'startDate', message: 'must be a valid ISO date' });
    }
    if (q.endDate !== undefined && q.endDate !== '' && !isValidISODate(q.endDate)) {
        errors.push({ field: 'endDate', message: 'must be a valid ISO date' });
    }

    if (errors.length > 0) {
        return next(new ValidationError('Invalid query parameters', errors));
    }
    next();
};

/* ------------------------- budget validators ------------------------- */

// Strict validator for POST /budgets.
// Required: month (YYYY-MM), monthlyGoal (>0), savingsTarget (>=0).
// userId is optional (nullable in this build, JWT is mocked) but, when supplied,
// must be a string. Unknown body keys are rejected.
const validateBudgetCreate = (req, _res, next) => {
    const body = req.body || {};
    const errors = [];

    if (!isValidMonth(body.month)) {
        errors.push({ field: 'month', message: 'must match YYYY-MM (e.g. 2026-04)' });
    }
    if (!isPositiveNumber(body.monthlyGoal)) {
        errors.push({ field: 'monthlyGoal', message: 'must be a positive number' });
    }
    if (!isNonNegativeNumber(body.savingsTarget)) {
        errors.push({
            field: 'savingsTarget',
            message: 'must be a non-negative number',
        });
    }
    if (
        body.userId !== undefined &&
        body.userId !== null &&
        typeof body.userId !== 'string'
    ) {
        errors.push({ field: 'userId', message: 'must be a string when provided' });
    }

    errors.push(...unknownKeyErrors(body, ALLOWED_BUDGET_CREATE_KEYS));

    if (errors.length > 0) {
        return next(new ValidationError('Invalid budget payload', errors));
    }
    next();
};

// Loose validator for PATCH /budgets/:id. Fields optional but must be valid when
// present. At least one allowed field must be supplied. id, userId, createdAt,
// updatedAt and any unknown key are rejected.
const validateBudgetUpdate = (req, _res, next) => {
    const body = req.body || {};
    const errors = [];

    if (Object.keys(body).length === 0) {
        return next(new ValidationError('Update body cannot be empty', []));
    }

    if (body.month !== undefined && !isValidMonth(body.month)) {
        errors.push({ field: 'month', message: 'must match YYYY-MM (e.g. 2026-04)' });
    }
    if (body.monthlyGoal !== undefined && !isPositiveNumber(body.monthlyGoal)) {
        errors.push({ field: 'monthlyGoal', message: 'must be a positive number' });
    }
    if (
        body.savingsTarget !== undefined &&
        !isNonNegativeNumber(body.savingsTarget)
    ) {
        errors.push({
            field: 'savingsTarget',
            message: 'must be a non-negative number',
        });
    }

    errors.push(...unknownKeyErrors(body, ALLOWED_BUDGET_UPDATE_KEYS));

    if (errors.length > 0) {
        return next(new ValidationError('Invalid budget update payload', errors));
    }
    next();
};

// Validator for GET /budgets query string.
// Rejects unknown filter keys and malformed month values up front.
// Empty-string values are treated as absent (matches the transaction filters).
const validateBudgetFilters = (req, _res, next) => {
    const q = req.query || {};
    const errors = [];

    for (const key of Object.keys(q)) {
        if (!ALLOWED_BUDGET_FILTER_KEYS.has(key)) {
            errors.push({
                field: key,
                message: `unknown filter. Allowed: ${[...ALLOWED_BUDGET_FILTER_KEYS].join(', ')}`,
            });
        }
    }

    if (q.month !== undefined && q.month !== '' && !isValidMonth(q.month)) {
        errors.push({ field: 'month', message: 'must match YYYY-MM' });
    }

    if (errors.length > 0) {
        return next(new ValidationError('Invalid query parameters', errors));
    }
    next();
};

module.exports = {
    validateTransactionCreate,
    validateTransactionUpdate,
    validateTransactionFilters,
    validateSummaryFilters,
    validateBudgetCreate,
    validateBudgetUpdate,
    validateBudgetFilters,
};
