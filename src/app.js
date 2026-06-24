require('dotenv').config();

const express = require('express');
const logger = require('./middleware/logger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const userRoutes = require('./routes/userRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const budgetRoutes = require('./routes/budgetRoutes');
const summaryRoutes = require('./routes/summaryRoutes');


const app = express();

// Middleware
app.use(logger);
app.use(express.json());

// Routes
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        message: 'Server is running'
    });
});
//User routes
// Fix: mount under /users prefix (was previously at /).
app.use('/users', userRoutes);
//Transaction routes
app.use('/transactions', transactionRoutes);
//Budget routes
app.use('/budgets', budgetRoutes);
//Summary routes
app.use('/summary', summaryRoutes);

// 404 fallback for unmatched routes
app.use(notFoundHandler);
// Global error handler (must be last)
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Start the server only when this file is invoked directly (e.g. `node src/app.js`).
// When imported by tests via supertest, the app object is exported instead so the
// test runner does not bind to a real port.
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

module.exports = app;