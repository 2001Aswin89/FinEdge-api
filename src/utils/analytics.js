// Pure functions over a transactions array. The caller is responsible for
// fetching and filtering transactions before passing them in, which keeps
// this layer service-agnostic and easy to test in isolation.
// Floats accumulate rounding error after enough adds, so everything exposed
// to clients is rounded to 2 decimal places.

const round2 = (n) => Math.round(n * 100) / 100;

const calculateTotals = (transactions) => {
    let income = 0;
    let expense = 0;
    for (const t of transactions) {
        if (t.type === 'income') income += t.amount;
        else if (t.type === 'expense') expense += t.amount;
    }
    return {
        totalIncome: round2(income),
        totalExpense: round2(expense),
        balance: round2(income - expense),
        transactionCount: transactions.length,
    };
};

// Group transactions by category. Returns a sorted array (highest first) which
// is friendlier for charting than an unsorted object. Defaults to expenses.
const categoryBreakdown = (transactions, type = 'expense') => {
    const buckets = new Map();
    for (const t of transactions) {
        if (t.type !== type) continue;
        buckets.set(t.category, (buckets.get(t.category) || 0) + t.amount);
    }
    return [...buckets.entries()]
        .map(([category, total]) => ({ category, total: round2(total) }))
        .sort((a, b) => b.total - a.total);
};

// Aggregate income and expense by YYYY-MM. Returns a chronologically sorted array.
const monthlyTrends = (transactions) => {
    const buckets = new Map();
    for (const t of transactions) {
        const d = new Date(t.date);
        if (Number.isNaN(d.getTime())) continue;
        const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
        if (!buckets.has(key)) buckets.set(key, { income: 0, expense: 0 });
        const bucket = buckets.get(key);
        if (t.type === 'income') bucket.income += t.amount;
        else if (t.type === 'expense') bucket.expense += t.amount;
    }
    return [...buckets.entries()]
        .map(([month, { income, expense }]) => ({
            month,
            income: round2(income),
            expense: round2(expense),
            balance: round2(income - expense),
        }))
        .sort((a, b) => a.month.localeCompare(b.month));
};

// One-shot summary used by GET /summary.
const buildSummary = (transactions) => ({
    totals: calculateTotals(transactions),
    byCategory: categoryBreakdown(transactions, 'expense'),
    monthlyTrends: monthlyTrends(transactions),
});

module.exports = {
    calculateTotals,
    categoryBreakdown,
    monthlyTrends,
    buildSummary,
};
