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

describe('validator middleware', () => {
    test('blocks request when ALL required fields are missing', async () => {
        const res = await request(app).post('/transactions').send({});
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/Invalid transaction payload/);
        const fields = res.body.errors.map((d) => d.field);
        expect(fields).toEqual(expect.arrayContaining(['type', 'category', 'amount', 'date']));
    });

    test('blocks request when amount is a string (wrong type)', async () => {
        const res = await request(app)
            .post('/transactions')
            .send({ type: 'expense', category: 'Food', amount: '500', date: '2026-04-01' });
        expect(res.status).toBe(400);
        expect(res.body.errors.some((d) => d.field === 'amount')).toBe(true);
    });

    test('blocks PATCH with an empty body', async () => {
        const res = await request(app)
            .patch('/transactions/some-id')
            .send({});
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/empty/);
    });
});

describe('errorHandler middleware', () => {
    test('returns 404 with NotFoundError message for missing transaction', async () => {
        const res = await request(app).get('/transactions/does-not-exist');
        expect(res.status).toBe(404);
        expect(res.body.message).toMatch(/Transaction with id 'does-not-exist' not found/);
    });

    test('returns 400 with parse-error message for malformed JSON body', async () => {
        const res = await request(app)
            .post('/transactions')
            .set('Content-Type', 'application/json')
            .send('{ this is not json }');
        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/Request body contains invalid JSON/);
    });
});

describe('notFoundHandler middleware', () => {
    test('returns 404 with Cannot METHOD URL for unknown route', async () => {
        const res = await request(app).get('/this-route-does-not-exist');
        expect(res.status).toBe(404);
        expect(res.body.message).toMatch(/Cannot GET/);
    });
});
