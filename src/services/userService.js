const jwt = require('jsonwebtoken');
const userModel = require('../models/userModel');

// simple ID generator 
const generateId = () => {
    return Date.now().toString();
};

const createUser = async ({ name, email }) => {
    const users = await userModel.getAllUsers();

    const existingUser = users.find(u => u.email === email);
    if (existingUser) {
        const error = new Error('User already exists');
        error.statusCode = 400; // attach status
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

    return newUser;
};

module.exports = {
    createUser
};