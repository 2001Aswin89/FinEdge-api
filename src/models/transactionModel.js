const fs = require('fs/promises');
const path = require('path');

// TRANSACTIONS_FILE env override allows pointing to a tmp fixture during tests.
const DEFAULT_PATH = path.join(__dirname, '../data/transactions.json');

const getFilePath = () =>
    process.env.TRANSACTIONS_FILE
        ? path.resolve(process.cwd(), process.env.TRANSACTIONS_FILE)
        : DEFAULT_PATH;

const getAllTransactions = async () => {
    try {
        const data = await fs.readFile(getFilePath(), 'utf-8');
        const parsed = JSON.parse(data || '[]');
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        // if file doesn't exist or is unreadable, return empty array
        return [];
    }
};

const saveTransactions = async (transactions) => {
    await fs.writeFile(getFilePath(), JSON.stringify(transactions, null, 2));
};

module.exports = {
    getAllTransactions,
    saveTransactions,
};
