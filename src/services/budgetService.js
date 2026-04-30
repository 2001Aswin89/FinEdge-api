const { randomUUID } = require('node:crypto');
const budgetModel = require('../models/budgetModel');
const { NotFoundError, ConflictError } = require('../utils/errors');

// Only these fields can be modified via PATCH.
// System fields (id, userId, createdAt, updatedAt) are not patchable.
const PATCHABLE_FIELDS = ['month', 'monthlyGoal', 'savingsTarget'];

const createBudget = async (payload) => {
    const budgets = await budgetModel.getAllBudgets();
    const userId = payload.userId || null;

    // Enforce uniqueness: at most one budget per (userId, month).
    const existing = budgets.find(
        (b) => b.userId === userId && b.month === payload.month
    );
    if (existing) {
        throw new ConflictError(
            `Budget already exists for user '${userId}' in month '${payload.month}'`
        );
    }

    const now = new Date().toISOString();
    const newBudget = {
        id: randomUUID(),
        userId,
        month: payload.month,
        monthlyGoal: payload.monthlyGoal,
        savingsTarget: payload.savingsTarget,
        createdAt: now,
        updatedAt: now,
    };

    budgets.push(newBudget);
    await budgetModel.saveBudgets(budgets);
    return newBudget;
};

const listBudgets = async (filters = {}) => {
    let budgets = await budgetModel.getAllBudgets();

    if (filters.userId) {
        budgets = budgets.filter((b) => b.userId === filters.userId);
    }
    if (filters.month) {
        budgets = budgets.filter((b) => b.month === filters.month);
    }

    // Newest month first.
    return budgets.sort((a, b) => b.month.localeCompare(a.month));
};

const getBudget = async (id) => {
    const budgets = await budgetModel.getAllBudgets();
    const budget = budgets.find((b) => b.id === id);
    if (!budget) throw new NotFoundError('Budget', id);
    return budget;
};

const updateBudget = async (id, patch) => {
    const budgets = await budgetModel.getAllBudgets();
    const idx = budgets.findIndex((b) => b.id === id);
    if (idx === -1) throw new NotFoundError('Budget', id);

    const cleanPatch = {};
    for (const key of PATCHABLE_FIELDS) {
        if (patch[key] !== undefined) cleanPatch[key] = patch[key];
    }

    // If month is changing, ensure no collision with another budget for the same user.
    if (cleanPatch.month && cleanPatch.month !== budgets[idx].month) {
        const collision = budgets.find(
            (b) =>
                b.userId === budgets[idx].userId &&
                b.month === cleanPatch.month &&
                b.id !== id
        );
        if (collision) {
            throw new ConflictError(
                `Budget already exists for user '${budgets[idx].userId}' in month '${cleanPatch.month}'`
            );
        }
    }

    budgets[idx] = {
        ...budgets[idx],
        ...cleanPatch,
        updatedAt: new Date().toISOString(),
    };
    await budgetModel.saveBudgets(budgets);
    return budgets[idx];
};

const deleteBudget = async (id) => {
    const budgets = await budgetModel.getAllBudgets();
    const idx = budgets.findIndex((b) => b.id === id);
    if (idx === -1) throw new NotFoundError('Budget', id);

    budgets.splice(idx, 1);
    await budgetModel.saveBudgets(budgets);
    return { id, deleted: true };
};

module.exports = {
    createBudget,
    listBudgets,
    getBudget,
    updateBudget,
    deleteBudget,
};
