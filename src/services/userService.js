const userModel = require('../models/userModel');

// simple ID generator 
const generateId = () => {
    return Date.now().toString();
};

const createUser = async ({ name, email }) => {
    const users = await userModel.getAllUsers();

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