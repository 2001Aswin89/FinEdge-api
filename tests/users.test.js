const os = require('node:os');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const USERS_TEST_FILE = path.join(os.tmpdir(), `finedge-users-${randomUUID()}.json`);

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-for-jest';
process.env.USERS_FILE = USERS_TEST_FILE;

const request = require('supertest');
const fs = require('fs/promises');
const app = require('../src/app');

beforeEach(async () => {
    await fs.writeFile(USERS_TEST_FILE, '[]', 'utf-8');
});

afterAll(async () => {
    try {
        await fs.unlink(USERS_TEST_FILE);
    } catch {
        /* ignore */
    }
});

describe('GET /health', () => {
    test('returns 200 with status ok', async () => {
        const res = await request(app).get('/health');
        expect(res.status).toBe(200);
        expect(res.body.status).toBe('ok');
        expect(res.body.message).toBe('Server is running');
    });
});

describe('POST /users', () => {
    test('registers a new user and returns user + JWT', async () => {
        const res = await request(app)
            .post('/users')
            .send({ name: 'Alice', email: 'alice@example.com' });

        expect(res.status).toBe(201);
        expect(res.body.message).toBe('User created successfully');
        expect(res.body.user.id).toBeDefined();
        expect(res.body.user.name).toBe('Alice');
        expect(res.body.user.email).toBe('alice@example.com');
        expect(res.body.user.createdAt).toBeDefined();
        expect(typeof res.body.token).toBe('string');
        expect(res.body.token.split('.')).toHaveLength(3);
    });

    test('rejects missing name with 400', async () => {
        const res = await request(app)
            .post('/users')
            .send({ email: 'bob@example.com' });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/required/);
    });

    test('rejects missing email with 400', async () => {
        const res = await request(app)
            .post('/users')
            .send({ name: 'Bob' });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/required/);
    });

    test('rejects whitespace-only name', async () => {
        const res = await request(app)
            .post('/users')
            .send({ name: '   ', email: 'whitespace@example.com' });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/required/);
    });

    test('normalizes email to lowercase on save', async () => {
        const res = await request(app)
            .post('/users')
            .send({ name: 'Carol', email: 'CAROL@EXAMPLE.COM' });
        expect(res.status).toBe(201);
        expect(res.body.user.email).toBe('carol@example.com');
    });

    test('rejects duplicate email (case-insensitive)', async () => {
        await request(app)
            .post('/users')
            .send({ name: 'Dave', email: 'dave@example.com' });

        const dup = await request(app)
            .post('/users')
            .send({ name: 'Dave Two', email: 'DAVE@EXAMPLE.COM' });

        expect(dup.status).toBe(400);
        expect(dup.body.message).toMatch(/already exists/);
    });
});
