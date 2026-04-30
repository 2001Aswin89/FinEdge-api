const express = require('express');
const router = express.Router();

const {
    createBudget,
    listBudgets,
    getBudget,
    updateBudget,
    deleteBudget,
} = require('../controllers/budgetController');

const {
    validateBudgetCreate,
    validateBudgetUpdate,
    validateBudgetFilters,
} = require('../middleware/validator');

// POST /budgets
router.post('/', validateBudgetCreate, createBudget);
// GET /budgets
router.get('/', validateBudgetFilters, listBudgets);
// GET /budgets/:id
router.get('/:id', getBudget);
// PATCH /budgets/:id
router.patch('/:id', validateBudgetUpdate, updateBudget);
// DELETE /budgets/:id
router.delete('/:id', deleteBudget);

module.exports = router;
