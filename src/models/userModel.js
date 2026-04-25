const fs = require('fs/promises');
const path = require('path');

const filePath = path.join(__dirname, '../data/users.json');

const getAllUsers = async () => {
    try {
        const data = await fs.readFile(filePath, 'utf-8');
        return JSON.parse(data || '[]');
    } catch (error) {
        // if file doesn't exist, return empty array
        return [];
    }
};

const saveUsers = async (users) => {
    await fs.writeFile(filePath, JSON.stringify(users, null, 2));
};

module.exports = {
    getAllUsers,
    saveUsers
};