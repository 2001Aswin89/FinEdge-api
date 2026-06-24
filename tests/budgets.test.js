const os = require('node:os');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const BUDGETS_TEST_FILE = path.join(os.tmpdir(), `finedge-budgets-${randomUUID()}.json`);
const TX_TEST_FILE = path.join(os.tmpdir(), `finedge-tx-${randomUUID()}.json`);
const USERS_TEST_FILE = path.join(os.tmpdir(), `finedge-users-${randomUUID()}.json`);

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-for-jest';
process.env.BUDGETS_FILE = BUDGETS_TEST_FILE;
process.env.TRANSACTIONS_FILE = TX_TEST_FILE;
process.env.USERS_FILE = USERS_TEST_FILE;

const request = require('supertest');
const fs = require('fs/promises');
const app = require('../src/app');

const validBudget = {
    userId: 'user-1',
    month: '2026-04',
    monthlyGoal: 50000,
    savingsTarget: 10000,
};

beforeEach(async () => {
    await fs.writeFile(BUDGETS_TEST_FILE, '[]', 'utf-8');
});

afterAll(async () => {
    try {
        await fs.unlink(BUDGETS_TEST_FILE);
    } catch {
        /* ignore */
    }
});

describe('POST /budgets', () => {
    test('creates a new budget with UUID and timestamps', async () => {
        const res = await request(app).post('/budgets').send(validBudget);

        expect(res.status).toBe(201);
        expect(res.body.message).toBe('Budget created successfully');
        expect(res.body.budget.id).toMatch(/^[0-9a-f-]{36}$/i);
        expect(res.body.budget.userId).toBe('user-1');
        expect(res.body.budget.month).toBe('2026-04');
        expect(res.body.budget.monthlyGoal).toBe(50000);
        expect(res.body.budget.savingsTarget).toBe(10000);
        expect(res.body.budget.createdAt).toBeDefined();
        expect(res.body.budget.updatedAt).toBeDefined();
    });

    test('rejects malformed month with 400 + validation errors', async () => {
        const res = await request(app)
            .post('/budgets')
            .send({ ...validBudget, month: 'April' });
        expect(res.status).toBe(400);
        expect(res.body.errors.some((d) => d.field === 'month')).toBe(true);
    });

    test('rejects month with bad day-component "2026-04-01"', async () => {
        const res = await request(app)
            .post('/budgets')
            .send({ ...validBudget, month: '2026-04-01' });
        expect(res.status).toBe(400);
    });

    test('rejects month "2026-13" (invalid month number)', async () => {
        const res = await request(app)
            .post('/budgets')
            .send({ ...validBudget, month: '2026-13' });
        expect(res.status).toBe(400);
    });

    test('rejects negative monthlyGoal', async () => {
        const res = await request(app)
            .post('/budgets')
            .send({ ...validBudget, monthlyGoal: -100 });
        expect(res.status).toBe(400);
        expect(res.body.errors.some((d) => d.field === 'monthlyGoal')).toBe(true);
    });

    test('rejects zero monthlyGoal (must be positive)', async () => {
        const res = await request(app)
            .post('/budgets')
            .send({ ...validBudget, monthlyGoal: 0 });
        expect(res.status).toBe(400);
    });

    test('rejects negative savingsTarget', async () => {
        const res = await request(app)
            .post('/budgets')
            .send({ ...validBudget, savingsTarget: -1 });
        expect(res.status).toBe(400);
        expect(res.body.errors.some((d) => d.field === 'savingsTarget')).toBe(true);
    });

    test('accepts savingsTarget of 0 (non-negative is fine)', async () => {
        const res = await request(app)
            .post('/budgets')
            .send({ ...validBudget, savingsTarget: 0 });
        expect(res.status).toBe(201);
        expect(res.body.budget.savingsTarget).toBe(0);
    });

    test('rejects unknown body keys', async () => {
        const res = await request(app)
            .post('/budgets')
            .send({ ...validBudget, evil: 'x' });
        expect(res.status).toBe(400);
        expect(res.body.errors.some((d) => d.field === 'evil')).toBe(true);
    });

    test('rejects missing required fields', async () => {
        const res = await request(app).post('/budgets').send({});
        expect(res.status).toBe(400);
        const fields = res.body.errors.map((d) => d.field);
        expect(fields).toEqual(expect.arrayContaining(['month', 'monthlyGoal', 'savingsTarget']));
    });

    test('returns 409 on duplicate (userId, month)', async () => {
        await request(app).post('/budgets').send(validBudget);
        const dup = await request(app).post('/budgets').send(validBudget);
        expect(dup.status).toBe(409);
        expect(dup.body.message).toMatch(/already exists/);
    });

    test('allows the same month for different users', async () => {
        await request(app).post('/budgets').send(validBudget);
        const res = await request(app)
            .post('/budgets')
            .send({ ...validBudget, userId: 'user-2' });
        expect(res.status).toBe(201);
    });

    test('allows different months for the same user', async () => {
        await request(app).post('/budgets').send(validBudget);
        const res = await request(app)
            .post('/budgets')
            .send({ ...validBudget, month: '2026-05' });
        expect(res.status).toBe(201);
    });
});

describe('GET /budgets', () => {
    test('returns empty array when none exist', async () => {
        const res = await request(app).get('/budgets');
        expect(res.status).toBe(200);
        expect(res.body.count).toBe(0);
        expect(res.body.budgets).toEqual([]);
    });

    test('returns budgets sorted newest month first', async () => {
        await request(app).post('/budgets').send({ ...validBudget, month: '2026-01' });
        await request(app).post('/budgets').send({ ...validBudget, month: '2026-04' });
        await request(app).post('/budgets').send({ ...validBudget, month: '2026-02' });
        const res = await request(app).get('/budgets');
        expect(res.body.count).toBe(3);
        expect(res.body.budgets[0].month).toBe('2026-04');
        expect(res.body.budgets[2].month).toBe('2026-01');
    });

    test('filters by userId', async () => {
        await request(app).post('/budgets').send(validBudget);
        await request(app)
            .post('/budgets')
            .send({ ...validBudget, userId: 'user-2' });
        const res = await request(app).get('/budgets?userId=user-1');
        expect(res.body.count).toBe(1);
        expect(res.body.budgets[0].userId).toBe('user-1');
    });

    test('filters by month', async () => {
        await request(app).post('/budgets').send(validBudget);
        await request(app)
            .post('/budgets')
            .send({ ...validBudget, month: '2026-05' });
        const res = await request(app).get('/budgets?month=2026-04');
        expect(res.body.count).toBe(1);
        expect(res.body.budgets[0].month).toBe('2026-04');
    });

    test('rejects malformed month filter', async () => {
        const res = await request(app).get('/budgets?month=April');
        expect(res.status).toBe(400);
        expect(res.body.errors.some((d) => d.field === 'month')).toBe(true);
    });

    test('rejects unknown filter key', async () => {
        const res = await request(app).get('/budgets?nonsense=x');
        expect(res.status).toBe(400);
        expect(res.body.errors.some((d) => d.field === 'nonsense')).toBe(true);
    });

    test('accepts empty filter values (no filter)', async () => {
        const res = await request(app).get('/budgets?userId=&month=');
        expect(res.status).toBe(200);
    });
});

describe('GET /budgets/:id', () => {
    test('returns the budget by id', async () => {
        const created = await request(app).post('/budgets').send(validBudget);
        const id = created.body.budget.id;
        const res = await request(app).get(`/budgets/${id}`);
        expect(res.status).toBe(200);
        expect(res.body.budget.id).toBe(id);
    });

    test('returns 404 for unknown id', async () => {
        const res = await request(app).get(
            '/budgets/00000000-0000-0000-0000-000000000000'
        );
        expect(res.status).toBe(404);
        expect(res.body.message).toMatch(/Budget with id/);
    });
});

describe('PATCH /budgets/:id', () => {
    test('updates monthlyGoal and refreshes updatedAt', async () => {
        const created = await request(app).post('/budgets').send(validBudget);
        const originalUpdatedAt = created.body.budget.updatedAt;

        await new Promise((r) => setTimeout(r, 5));

        const res = await request(app)
            .patch(`/budgets/${created.body.budget.id}`)
            .send({ monthlyGoal: 60000 });

        expect(res.status).toBe(200);
        expect(res.body.budget.monthlyGoal).toBe(60000);
        expect(res.body.budget.savingsTarget).toBe(10000);
        expect(res.body.budget.updatedAt).not.toBe(originalUpdatedAt);
    });

    test('updates savingsTarget', async () => {
        const created = await request(app).post('/budgets').send(validBudget);
        const res = await request(app)
            .patch(`/budgets/${created.body.budget.id}`)
            .send({ savingsTarget: 15000 });
        expect(res.status).toBe(200);
        expect(res.body.budget.savingsTarget).toBe(15000);
    });

    test('PATCH month succeeds when target month is free for that user', async () => {
        const created = await request(app).post('/budgets').send(validBudget);
        const res = await request(app)
            .patch(`/budgets/${created.body.budget.id}`)
            .send({ month: '2026-05' });
        expect(res.status).toBe(200);
        expect(res.body.budget.month).toBe('2026-05');
    });

    test('PATCH month conflicts (409) when target (userId, month) already exists', async () => {
        const a = await request(app).post('/budgets').send(validBudget);
        await request(app)
            .post('/budgets')
            .send({ ...validBudget, month: '2026-05' });
        const res = await request(app)
            .patch(`/budgets/${a.body.budget.id}`)
            .send({ month: '2026-05' });
        expect(res.status).toBe(409);
        expect(res.body.message).toMatch(/already exists/);
    });

    test('rejects empty update body', async () => {
        const created = await request(app).post('/budgets').send(validBudget);
        const res = await request(app)
            .patch(`/budgets/${created.body.budget.id}`)
            .send({});
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/empty/);
    });

    test('rejects attempt to mutate id', async () => {
        const created = await request(app).post('/budgets').send(validBudget);
        const res = await request(app)
            .patch(`/budgets/${created.body.budget.id}`)
            .send({ id: 'hacked-id' });
        expect(res.status).toBe(400);
        expect(res.body.errors.some((d) => d.field === 'id')).toBe(true);
    });

    test('rejects attempt to mutate userId', async () => {
        const created = await request(app).post('/budgets').send(validBudget);
        const res = await request(app)
            .patch(`/budgets/${created.body.budget.id}`)
            .send({ userId: 'someone-else' });
        expect(res.status).toBe(400);
        expect(res.body.errors.some((d) => d.field === 'userId')).toBe(true);
    });

    test('rejects attempt to mutate createdAt', async () => {
        const created = await request(app).post('/budgets').send(validBudget);
        const res = await request(app)
            .patch(`/budgets/${created.body.budget.id}`)
            .send({ createdAt: '1990-01-01T00:00:00.000Z' });
        expect(res.status).toBe(400);
        expect(res.body.errors.some((d) => d.field === 'createdAt')).toBe(true);
    });

    test('rejects unknown fields', async () => {
        const created = await request(app).post('/budgets').send(validBudget);
        const res = await request(app)
            .patch(`/budgets/${created.body.budget.id}`)
            .send({ evil: 'x' });
        expect(res.status).toBe(400);
        expect(res.body.errors.some((d) => d.field === 'evil')).toBe(true);
    });

    test('returns 404 for unknown id', async () => {
        const res = await request(app)
            .patch('/budgets/00000000-0000-0000-0000-000000000000')
            .send({ monthlyGoal: 1 });
        expect(res.status).toBe(404);
    });

    test('valid PATCH does NOT touch id, userId, or createdAt', async () => {
        const created = await request(app).post('/budgets').send(validBudget);
        const { id, userId, createdAt } = created.body.budget;
        const res = await request(app)
            .patch(`/budgets/${id}`)
            .send({ monthlyGoal: 99999 });
        expect(res.status).toBe(200);
        expect(res.body.budget.id).toBe(id);
        expect(res.body.budget.userId).toBe(userId);
        expect(res.body.budget.createdAt).toBe(createdAt);
    });
});

describe('DELETE /budgets/:id', () => {
    test('removes a budget', async () => {
        const created = await request(app).post('/budgets').send(validBudget);
        const id = created.body.budget.id;

        const del = await request(app).delete(`/budgets/${id}`);
        expect(del.status).toBe(200);
        expect(del.body.deleted).toBe(true);

        const after = await request(app).get(`/budgets/${id}`);
        expect(after.status).toBe(404);
    });

    test('returns 404 for unknown id', async () => {
        const res = await request(app).delete(
            '/budgets/00000000-0000-0000-0000-000000000000'
        );
        expect(res.status).toBe(404);
    });
});
