const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');

// simple ID generator 
const generateId = () => {
    return Date.now().toString();
};

// Generates JWT token for user session (mock auth for now)
// NOTE: Will be used by future auth middleware (Member 3)
const generateToken = (user) => {
    return jwt.sign(
        { id: user.id, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
    );
};

const createUser = async ({ name, email }) => {
    const users = await userModel.getAllUsers();

    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
        const error = new Error('User already exists');
        error.statusCode = 400;
        throw error;
    }

    const newUser = {
        id: generateId(),
        name,
        email,
        createdAt: new Date().toISOString()
    };

    users.push(newUser);
    await userModel.saveUsers(users);

    const token = generateToken(newUser);

    // Returning token with user for future protected routes (e.g., transactions)
    return {
        user: newUser,
        token
    };
};

module.exports = {
    createUser
};