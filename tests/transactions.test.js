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

const validTx = {
    type: 'expense',
    category: 'Groceries',
    amount: 1500,
    date: '2026-04-15',
    description: 'Weekly grocery run',
};

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

describe('POST /transactions', () => {
    test('creates a new transaction with UUID and timestamps', async () => {
        const res = await request(app).post('/transactions').send(validTx);

        expect(res.status).toBe(201);
        expect(res.body.message).toBe('Transaction created successfully');
        expect(res.body.transaction.id).toMatch(/^[0-9a-f-]{36}$/i);
        expect(res.body.transaction.type).toBe('expense');
        expect(res.body.transaction.amount).toBe(1500);
        expect(res.body.transaction.createdAt).toBeDefined();
        expect(res.body.transaction.updatedAt).toBeDefined();
    });

    test('rejects invalid type with 400 + validation errors', async () => {
        const res = await request(app)
            .post('/transactions')
            .send({ ...validTx, type: 'gift' });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/Invalid transaction payload/);
        expect(res.body.errors.some((d) => d.field === 'type')).toBe(true);
    });

    test('rejects negative amount', async () => {
        const res = await request(app)
            .post('/transactions')
            .send({ ...validTx, amount: -100 });

        expect(res.status).toBe(400);
        expect(res.body.errors.some((d) => d.field === 'amount')).toBe(true);
    });

    test('rejects missing date', async () => {
        const { date, ...incomplete } = validTx;
        const res = await request(app).post('/transactions').send(incomplete);

        expect(res.status).toBe(400);
        expect(res.body.errors.some((d) => d.field === 'date')).toBe(true);
    });
});

describe('GET /transactions', () => {
    test('returns empty array when no transactions exist', async () => {
        const res = await request(app).get('/transactions');
        expect(res.status).toBe(200);
        expect(res.body.count).toBe(0);
        expect(res.body.transactions).toEqual([]);
    });

    test('returns all transactions sorted newest first', async () => {
        await request(app).post('/transactions').send({ ...validTx, date: '2026-01-10' });
        await request(app).post('/transactions').send({ ...validTx, date: '2026-04-15' });
        await request(app).post('/transactions').send({ ...validTx, date: '2026-02-20' });

        const res = await request(app).get('/transactions');
        expect(res.status).toBe(200);
        expect(res.body.count).toBe(3);
        expect(res.body.transactions[0].date).toContain('2026-04-15');
        expect(res.body.transactions[2].date).toContain('2026-01-10');
    });

    test('filters by type', async () => {
        await request(app).post('/transactions').send(validTx);
        await request(app)
            .post('/transactions')
            .send({ ...validTx, type: 'income', category: 'Salary', amount: 50000 });

        const res = await request(app).get('/transactions?type=income');
        expect(res.body.count).toBe(1);
        expect(res.body.transactions[0].type).toBe('income');
    });

    test('filters by date range', async () => {
        await request(app).post('/transactions').send({ ...validTx, date: '2026-01-15' });
        await request(app).post('/transactions').send({ ...validTx, date: '2026-03-15' });
        await request(app).post('/transactions').send({ ...validTx, date: '2026-05-15' });

        const res = await request(app).get('/transactions?startDate=2026-02-01&endDate=2026-04-30');
        expect(res.body.count).toBe(1);
        expect(res.body.transactions[0].date).toContain('2026-03-15');
    });
});

describe('GET /transactions/:id', () => {
    test('returns the transaction by id', async () => {
        const created = await request(app).post('/transactions').send(validTx);
        const id = created.body.transaction.id;

        const res = await request(app).get(`/transactions/${id}`);
        expect(res.status).toBe(200);
        expect(res.body.transaction.id).toBe(id);
    });

    test('returns 404 for unknown id', async () => {
        const res = await request(app).get('/transactions/00000000-0000-0000-0000-000000000000');
        expect(res.status).toBe(404);
        expect(res.body.message).toMatch(/Transaction with id/);
    });
});

describe('PATCH /transactions/:id', () => {
    test('updates allowed fields and refreshes updatedAt', async () => {
        const created = await request(app).post('/transactions').send(validTx);
        const id = created.body.transaction.id;
        const originalUpdatedAt = created.body.transaction.updatedAt;

        await new Promise((r) => setTimeout(r, 5));

        const res = await request(app)
            .patch(`/transactions/${id}`)
            .send({ amount: 1750, category: 'Food' });

        expect(res.status).toBe(200);
        expect(res.body.transaction.amount).toBe(1750);
        expect(res.body.transaction.category).toBe('Food');
        expect(res.body.transaction.type).toBe('expense');
        expect(res.body.transaction.updatedAt).not.toBe(originalUpdatedAt);
    });

    test('rejects empty update body', async () => {
        const created = await request(app).post('/transactions').send(validTx);
        const res = await request(app).patch(`/transactions/${created.body.transaction.id}`).send({});

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/empty/);
    });

    test('returns 404 for unknown id', async () => {
        const res = await request(app)
            .patch('/transactions/00000000-0000-0000-0000-000000000000')
            .send({ amount: 999 });
        expect(res.status).toBe(404);
    });
});

describe('DELETE /transactions/:id', () => {
    test('removes a transaction', async () => {
        const created = await request(app).post('/transactions').send(validTx);
        const id = created.body.transaction.id;

        const del = await request(app).delete(`/transactions/${id}`);
        expect(del.status).toBe(200);
        expect(del.body.deleted).toBe(true);

        const after = await request(app).get(`/transactions/${id}`);
        expect(after.status).toBe(404);
    });

    test('returns 404 for unknown id', async () => {
        const res = await request(app).delete('/transactions/00000000-0000-0000-0000-000000000000');
        expect(res.status).toBe(404);
    });
});

describe('PATCH /transactions/:id data integrity', () => {
    test('rejects attempt to mutate id', async () => {
        const created = await request(app).post('/transactions').send(validTx);
        const res = await request(app)
            .patch(`/transactions/${created.body.transaction.id}`)
            .send({ id: 'hacked-id' });

        expect(res.status).toBe(400);
        expect(res.body.errors.some((d) => d.field === 'id')).toBe(true);
    });

    test('rejects attempt to mutate createdAt', async () => {
        const created = await request(app).post('/transactions').send(validTx);
        const res = await request(app)
            .patch(`/transactions/${created.body.transaction.id}`)
            .send({ createdAt: '1990-01-01T00:00:00.000Z' });
        expect(res.status).toBe(400);
        expect(res.body.errors.some((d) => d.field === 'createdAt')).toBe(true);
    });

    test('rejects attempt to mutate userId', async () => {
        const created = await request(app).post('/transactions').send(validTx);
        const res = await request(app)
            .patch(`/transactions/${created.body.transaction.id}`)
            .send({ userId: 'someone-else' });
        expect(res.status).toBe(400);
        expect(res.body.errors.some((d) => d.field === 'userId')).toBe(true);
    });

    test('rejects unknown fields', async () => {
        const created = await request(app).post('/transactions').send(validTx);
        const res = await request(app)
            .patch(`/transactions/${created.body.transaction.id}`)
            .send({ evil: 'persisted' });
        expect(res.status).toBe(400);
        expect(res.body.errors.some((d) => d.field === 'evil')).toBe(true);
    });

    test('valid PATCH does NOT touch createdAt or id', async () => {
        const created = await request(app).post('/transactions').send(validTx);
        const { id, createdAt } = created.body.transaction;

        const res = await request(app)
            .patch(`/transactions/${id}`)
            .send({ amount: 9999 });
        expect(res.status).toBe(200);
        expect(res.body.transaction.id).toBe(id);
        expect(res.body.transaction.createdAt).toBe(createdAt);
    });
});

describe('GET /transactions filter validation', () => {
    test('rejects nonsense type with 400', async () => {
        const res = await request(app).get('/transactions?type=banana');
        expect(res.status).toBe(400);
        expect(res.body.errors.some((d) => d.field === 'type')).toBe(true);
    });

    test('rejects malformed startDate with 400', async () => {
        const res = await request(app).get('/transactions?startDate=banana');
        expect(res.status).toBe(400);
        expect(res.body.errors.some((d) => d.field === 'startDate')).toBe(true);
    });

    test('accepts empty filter values (no filter)', async () => {
        const res = await request(app).get('/transactions?type=&startDate=');
        expect(res.status).toBe(200);
    });
});

describe('POST /transactions date strictness', () => {
    test('rejects loose date "2026"', async () => {
        const res = await request(app)
            .post('/transactions')
            .send({ ...validTx, date: '2026' });
        expect(res.status).toBe(400);
    });

    test('accepts YYYY-MM-DD', async () => {
        const res = await request(app)
            .post('/transactions')
            .send({ ...validTx, date: '2026-04-15' });
        expect(res.status).toBe(201);
    });

    test('accepts full ISO 8601 with timezone', async () => {
        const res = await request(app)
            .post('/transactions')
            .send({ ...validTx, date: '2026-04-15T10:30:00Z' });
        expect(res.status).toBe(201);
    });
});
