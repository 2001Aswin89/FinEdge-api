const budgetService = require('../services/budgetService');

const createBudget = async (req, res, next) => {
    try {
        const budget = await budgetService.createBudget(req.body);
        res.status(201).json({
            message: 'Budget created successfully',
            budget,
        });
    } catch (error) {
        next(error);
    }
};

const listBudgets = async (req, res, next) => {
    try {
        const { userId, month } = req.query;
        const budgets = await budgetService.listBudgets({ userId, month });
        res.status(200).json({
            message: 'Budgets fetched successfully',
            count: budgets.length,
            budgets,
        });
    } catch (error) {
        next(error);
    }
};

const getBudget = async (req, res, next) => {
    try {
        const budget = await budgetService.getBudget(req.params.id);
        res.status(200).json({
            message: 'Budget fetched successfully',
            budget,
        });
    } catch (error) {
        next(error);
    }
};

const updateBudget = async (req, res, next) => {
    try {
        const budget = await budgetService.updateBudget(
            req.params.id,
            req.body
        );
        res.status(200).json({
            message: 'Budget updated successfully',
            budget,
        });
    } catch (error) {
        next(error);
    }
};

const deleteBudget = async (req, res, next) => {
    try {
        const result = await budgetService.deleteBudget(req.params.id);
        res.status(200).json({
            message: 'Budget deleted successfully',
            ...result,
        });
    } catch (error) {
        next(error);
    }
};

module.exports = {
    createBudget,
    listBudgets,
    getBudget,
    updateBudget,
    deleteBudget,
};
