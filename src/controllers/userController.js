const userService = require('../services/userService');

const registerUser = async (req, res, next) => {
    try {
        const { name, email } = req.body;

        if (!name || !email) {
            return res.status(400).json({
                message: 'Name and email are required'
            });
        }

        const newUser = await userService.createUser({ name, email });

        res.status(201).json({
            message: 'User created successfully',
            data: newUser
        });
    } catch (error) {

        // NOTE: This duplicate email check will later be handled
        // via centralized validation middleware (M3)        
        res.status(error.statusCode || 500).json({
            message: error.message || 'Internal Server Error'
        });

        // next(error);  pass to global error handler (Member 3 to handle later)

    }
};

module.exports = {
    registerUser
};