const transactionService = require('../services/transactionService');
const analytics = require('../utils/analytics');

const getSummary = async (req, res, next) => {
    try {
        const { category, startDate, endDate, userId } = req.query;
        const transactions = await transactionService.listTransactions({
            category,
            startDate,
            endDate,
            userId,
        });
        const summary = analytics.buildSummary(transactions);
        res.status(200).json({
            message: 'Summary fetched successfully',
            ...summary,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    getSummary,
};
