const os = require('node:os');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const TX_TEST_FILE = path.join(os.tmpdir(), `finedge-tx-${randomUUID()}.json`);
const USERS_TEST_FILE = path.join(os.tmpdir(), `finedge-users-${randomUUID()}.json`);

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-for-jest';
process.env.TRANSACTIONS_FILE = TX_TEST_FILE;
process.env.USERS_FILE = USERS_TEST_FILE;

const request = require('supertest');
const fs = require('fs/promises');
const app = require('../src/app');

beforeEach(async () => {
    await fs.writeFile(TX_TEST_FILE, '[]', 'utf-8');
});

afterAll(async () => {
    try {
        await fs.unlink(TX_TEST_FILE);
    } catch {
        /* ignore */
    }
});

describe('GET /summary basic shape', () => {
    test('returns totals, byCategory, monthlyTrends with empty data', async () => {
        const res = await request(app).get('/summary');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('totals');
        expect(res.body).toHaveProperty('byCategory');
        expect(res.body).toHaveProperty('monthlyTrends');
        expect(res.body.totals.balance).toBe(0);
    });

    test('aggregates income, expense and balance across transactions', async () => {
        await request(app)
            .post('/transactions')
            .send({ type: 'income', category: 'Salary', amount: 60000, date: '2026-04-01' });
        await request(app)
            .post('/transactions')
            .send({ type: 'expense', category: 'Rent', amount: 20000, date: '2026-04-02' });

        const res = await request(app).get('/summary');
        expect(res.status).toBe(200);
        expect(res.body.totals.totalIncome).toBe(60000);
        expect(res.body.totals.totalExpense).toBe(20000);
        expect(res.body.totals.balance).toBe(40000);
    });

    test('builds byCategory sorted highest first', async () => {
        await request(app)
            .post('/transactions')
            .send({ type: 'expense', category: 'Food', amount: 1500, date: '2026-04-05' });
        await request(app)
            .post('/transactions')
            .send({ type: 'expense', category: 'Rent', amount: 18000, date: '2026-04-01' });

        const res = await request(app).get('/summary');
        expect(res.body.byCategory[0]).toEqual({ category: 'Rent', total: 18000 });
        expect(res.body.byCategory[1]).toEqual({ category: 'Food', total: 1500 });
    });
});

describe('GET /summary filter validation', () => {
    test('rejects malformed startDate with 400', async () => {
        const res = await request(app).get('/summary?startDate=banana');
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/Invalid query parameters/);
    });

    test('rejects unknown filter key (type is not a summary filter)', async () => {
        const res = await request(app).get('/summary?type=expense');
        expect(res.status).toBe(400);
        expect(res.body.errors.some((d) => d.field === 'type')).toBe(true);
    });
});
