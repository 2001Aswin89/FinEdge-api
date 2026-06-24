const fs = require('fs/promises');
const path = require('path');

// USERS_FILE env override allows pointing to a tmp fixture during tests.
const DEFAULT_PATH = path.join(__dirname, '../data/users.json');

const getFilePath = () =>
    process.env.USERS_FILE
        ? path.resolve(process.cwd(), process.env.USERS_FILE)
        : DEFAULT_PATH;

const getAllUsers = async () => {
    try {
        const data = await fs.readFile(getFilePath(), 'utf-8');
        return JSON.parse(data || '[]');
    } catch (error) {
        // if file doesn't exist, return empty array
        return [];
    }
};

const saveUsers = async (users) => {
    await fs.writeFile(getFilePath(), JSON.stringify(users, null, 2));
};

module.exports = {
    getAllUsers,
    saveUsers,
};
