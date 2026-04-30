require('dotenv').config();

const express = require('express');

const app = express();

// Middleware
app.use(express.json());

// Routes
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        message: 'Server is running'
    });
});

const PORT = process.env.PORT || 5000;

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});