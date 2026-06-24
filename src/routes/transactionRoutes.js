const express = require('express');
const router = express.Router();

const {
    createTransaction,
    listTransactions,
    getTransaction,
    updateTransaction,
    deleteTransaction,
} = require('../controllers/transactionController');

const {
    validateTransactionCreate,
    validateTransactionUpdate,
    validateTransactionFilters,
} = require('../middleware/validator');

// POST /transactions
router.post('/', validateTransactionCreate, createTransaction);
// GET /transactions
router.get('/', validateTransactionFilters, listTransactions);
// GET /transactions/:id
router.get('/:id', getTransaction);
// PATCH /transactions/:id
router.patch('/:id', validateTransactionUpdate, updateTransaction);
// DELETE /transactions/:id
router.delete('/:id', deleteTransaction);

module.exports = router;
