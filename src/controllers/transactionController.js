const transactionService = require('../services/transactionService');

const createTransaction = async (req, res, next) => {
    try {
        const transaction = await transactionService.createTransaction(req.body);
        res.status(201).json({
            message: 'Transaction created successfully',
            transaction,
        });
    } catch (error) {

        // NOTE: This inline error response will later be handled
        // via centralized error handler middleware (M3)
        res.status(error.statusCode || 500).json({
            message: error.message || 'Internal Server Error',
        });

        // next(error);  pass to global error handler (Member 3 to handle later)

    }
};

const listTransactions = async (req, res, next) => {
    try {
        const { type, category, startDate, endDate, userId } = req.query;
        const transactions = await transactionService.listTransactions({
            type,
            category,
            startDate,
            endDate,
            userId,
        });
        res.status(200).json({
            message: 'Transactions fetched successfully',
            count: transactions.length,
            transactions,
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            message: error.message || 'Internal Server Error',
        });
    }
};

const getTransaction = async (req, res, next) => {
    try {
        const transaction = await transactionService.getTransaction(req.params.id);
        res.status(200).json({
            message: 'Transaction fetched successfully',
            transaction,
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            message: error.message || 'Internal Server Error',
        });
    }
};

const updateTransaction = async (req, res, next) => {
    try {
        const transaction = await transactionService.updateTransaction(
            req.params.id,
            req.body
        );
        res.status(200).json({
            message: 'Transaction updated successfully',
            transaction,
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            message: error.message || 'Internal Server Error',
        });
    }
};

const deleteTransaction = async (req, res, next) => {
    try {
        const result = await transactionService.deleteTransaction(req.params.id);
        res.status(200).json({
            message: 'Transaction deleted successfully',
            ...result,
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            message: error.message || 'Internal Server Error',
        });
    }
};

module.exports = {
    createTransaction,
    listTransactions,
    getTransaction,
    updateTransaction,
    deleteTransaction,
};
