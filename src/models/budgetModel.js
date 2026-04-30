const fs = require('fs/promises');
const path = require('path');

// BUDGETS_FILE env override allows pointing to a tmp fixture during tests.
const DEFAULT_PATH = path.join(__dirname, '../data/budgets.json');

const getFilePath = () =>
    process.env.BUDGETS_FILE
        ? path.resolve(process.cwd(), process.env.BUDGETS_FILE)
        : DEFAULT_PATH;

const getAllBudgets = async () => {
    try {
        const data = await fs.readFile(getFilePath(), 'utf-8');
        const parsed = JSON.parse(data || '[]');
        return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
        // if file doesn't exist or is unreadable, return empty array
        return [];
    }
};

const saveBudgets = async (budgets) => {
    await fs.writeFile(getFilePath(), JSON.stringify(budgets, null, 2));
};

module.exports = {
    getAllBudgets,
    saveBudgets,
};
