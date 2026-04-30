const {
    calculateTotals,
    categoryBreakdown,
    monthlyTrends,
    buildSummary,
} = require('../src/utils/analytics');

describe('analytics', () => {
    const txs = [
        { type: 'income', category: 'Salary', amount: 50000, date: '2026-01-15' },
        { type: 'income', category: 'Freelance', amount: 10000, date: '2026-02-10' },
        { type: 'expense', category: 'Rent', amount: 20000, date: '2026-01-05' },
        { type: 'expense', category: 'Food', amount: 5000, date: '2026-01-20' },
        { type: 'expense', category: 'Food', amount: 3000, date: '2026-02-15' },
    ];

    test('calculateTotals sums income, expense, and balance correctly', () => {
        const totals = calculateTotals(txs);
        expect(totals.totalIncome).toBe(60000);
        expect(totals.totalExpense).toBe(28000);
        expect(totals.balance).toBe(32000);
        expect(totals.transactionCount).toBe(5);
    });

    test('categoryBreakdown groups expenses and sorts descending', () => {
        const breakdown = categoryBreakdown(txs, 'expense');
        expect(breakdown).toEqual([
            { category: 'Rent', total: 20000 },
            { category: 'Food', total: 8000 },
        ]);
    });

    test('monthlyTrends groups by YYYY-MM chronologically', () => {
        const trends = monthlyTrends(txs);
        expect(trends).toHaveLength(2);
        expect(trends[0].month).toBe('2026-01');
        expect(trends[0].income).toBe(50000);
        expect(trends[0].expense).toBe(25000);
        expect(trends[1].month).toBe('2026-02');
    });

    test('buildSummary returns the full shape', () => {
        const summary = buildSummary(txs);
        expect(summary).toHaveProperty('totals');
        expect(summary).toHaveProperty('byCategory');
        expect(summary).toHaveProperty('monthlyTrends');
    });

    test('handles empty input gracefully', () => {
        expect(calculateTotals([])).toEqual({
            totalIncome: 0,
            totalExpense: 0,
            balance: 0,
            transactionCount: 0,
        });
        expect(categoryBreakdown([])).toEqual([]);
        expect(monthlyTrends([])).toEqual([]);
    });
});
