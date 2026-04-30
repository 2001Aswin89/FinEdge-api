const express = require('express');
const router = express.Router();

const {
    createBudget,
    listBudgets,
    getBudget,
    updateBudget,
    deleteBudget,
} = require('../controllers/budgetController');

// NOTE: Validator middleware (Member 3) will be wired onto the body / query
// routes once middleware/validator.js lands in the next branch.

// POST /budgets
router.post('/', createBudget);
// GET /budgets
router.get('/', listBudgets);
// GET /budgets/:id
router.get('/:id', getBudget);
// PATCH /budgets/:id
router.patch('/:id', updateBudget);
// DELETE /budgets/:id
router.delete('/:id', deleteBudget);

module.exports = router;
