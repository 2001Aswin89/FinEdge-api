const { randomUUID } = require('node:crypto');
const transactionModel = require('../models/transactionModel');
const { NotFoundError } = require('../utils/errors');

// Only these fields can be modified via PATCH.
// System fields (id, userId, createdAt, updatedAt) are not patchable.
const PATCHABLE_FIELDS = ['type', 'category', 'amount', 'date', 'description'];

const createTransaction = async (payload) => {
    const transactions = await transactionModel.getAllTransactions();
    const now = new Date().toISOString();

    const newTransaction = {
        id: randomUUID(),
        userId: payload.userId || null,
        type: payload.type,
        category: payload.category,
        amount: payload.amount,
        date: new Date(payload.date).toISOString(),
        description: payload.description || '',
        createdAt: now,
        updatedAt: now,
    };

    transactions.push(newTransaction);
    await transactionModel.saveTransactions(transactions);
    return newTransaction;
};

const listTransactions = async (filters = {}) => {
    let transactions = await transactionModel.getAllTransactions();

    if (filters.type) {
        transactions = transactions.filter((t) => t.type === filters.type);
    }
    if (filters.category) {
        transactions = transactions.filter(
            (t) => t.category.toLowerCase() === filters.category.toLowerCase()
        );
    }
    if (filters.startDate) {
        const start = new Date(filters.startDate).getTime();
        transactions = transactions.filter((t) => new Date(t.date).getTime() >= start);
    }
    if (filters.endDate) {
        const end = new Date(filters.endDate).getTime();
        transactions = transactions.filter((t) => new Date(t.date).getTime() <= end);
    }
    if (filters.userId) {
        transactions = transactions.filter((t) => t.userId === filters.userId);
    }

    // Newest first.
    return transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
};

const getTransaction = async (id) => {
    const transactions = await transactionModel.getAllTransactions();
    const transaction = transactions.find((t) => t.id === id);
    if (!transaction) throw new NotFoundError('Transaction', id);
    return transaction;
};

const updateTransaction = async (id, patch) => {
    const transactions = await transactionModel.getAllTransactions();
    const idx = transactions.findIndex((t) => t.id === id);
    if (idx === -1) throw new NotFoundError('Transaction', id);

    const cleanPatch = {};
    for (const key of PATCHABLE_FIELDS) {
        if (patch[key] !== undefined) cleanPatch[key] = patch[key];
    }
    if (cleanPatch.date) {
        cleanPatch.date = new Date(cleanPatch.date).toISOString();
    }

    transactions[idx] = {
        ...transactions[idx],
        ...cleanPatch,
        updatedAt: new Date().toISOString(),
    };
    await transactionModel.saveTransactions(transactions);
    return transactions[idx];
};

const deleteTransaction = async (id) => {
    const transactions = await transactionModel.getAllTransactions();
    const idx = transactions.findIndex((t) => t.id === id);
    if (idx === -1) throw new NotFoundError('Transaction', id);

    transactions.splice(idx, 1);
    await transactionModel.saveTransactions(transactions);
    return { id, deleted: true };
};

module.exports = {
    createTransaction,
    listTransactions,
    getTransaction,
    updateTransaction,
    deleteTransaction,
};
