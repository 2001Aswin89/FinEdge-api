const express = require('express');
const router = express.Router();

const { getSummary } = require('../controllers/summaryController');
const { validateSummaryFilters } = require('../middleware/validator');

// GET /summary
router.get('/', validateSummaryFilters, getSummary);

module.exports = router;
