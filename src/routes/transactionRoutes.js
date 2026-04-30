const express = require('express');
const router = express.Router();

const {
    createTransaction,
    listTransactions,
    getTransaction,
    updateTransaction,
    deleteTransaction,
} = require('../controllers/transactionController');

// NOTE: Validator middleware (Member 3) will be wired onto the body / query
// routes once middleware/validator.js lands in the next branch.

// POST /transactions
router.post('/', createTransaction);
// GET /transactions
router.get('/', listTransactions);
// GET /transactions/:id
router.get('/:id', getTransaction);
// PATCH /transactions/:id
router.patch('/:id', updateTransaction);
// DELETE /transactions/:id
router.delete('/:id', deleteTransaction);

module.exports = router;
