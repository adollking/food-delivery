const request = require('supertest');
const app = require('../app');
const { connect, disconnect, clearDatabase } = require('./helpers/db');

beforeAll(async () => await connect());
afterAll(async () => await disconnect());
beforeEach(async () => await clearDatabase());

describe('POST /api/auth/register', () => {
    it('creates a user and returns a JWT token', async () => {
        const res = await request(app).post('/api/auth/register').send({
            name: 'Alice',
            email: 'alice@test.com',
            password: 'pass123',
        });

        expect(res.status).toBe(201);
        expect(res.body.token).toBeDefined();
        expect(res.body.user.email).toBe('alice@test.com');
        expect(res.body.user.role).toBe('customer');
        expect(res.body.user).not.toHaveProperty('password');
    });

    it('accepts a custom role', async () => {
        const res = await request(app).post('/api/auth/register').send({
            name: 'Owner',
            email: 'owner@test.com',
            password: 'pass123',
            role: 'restaurant_owner',
        });

        expect(res.status).toBe(201);
        expect(res.body.user.role).toBe('restaurant_owner');
    });

    it('returns 409 when email is already registered', async () => {
        await request(app).post('/api/auth/register').send({
            name: 'Alice',
            email: 'alice@test.com',
            password: 'pass123',
        });

        const res = await request(app).post('/api/auth/register').send({
            name: 'Alice 2',
            email: 'alice@test.com',
            password: 'other',
        });

        expect(res.status).toBe(409);
        expect(res.body.message).toMatch(/already in use/i);
    });

    it('returns 400 when required fields are missing', async () => {
        const res = await request(app).post('/api/auth/register').send({
            email: 'alice@test.com',
        });

        expect(res.status).toBe(400);
    });
});

describe('POST /api/auth/login', () => {
    beforeEach(async () => {
        await request(app).post('/api/auth/register').send({
            name: 'Alice',
            email: 'alice@test.com',
            password: 'pass123',
        });
    });

    it('returns a token on valid credentials', async () => {
        const res = await request(app).post('/api/auth/login').send({
            email: 'alice@test.com',
            password: 'pass123',
        });

        expect(res.status).toBe(200);
        expect(res.body.token).toBeDefined();
        expect(res.body.user.email).toBe('alice@test.com');
    });

    it('returns 401 on wrong password', async () => {
        const res = await request(app).post('/api/auth/login').send({
            email: 'alice@test.com',
            password: 'wrong',
        });

        expect(res.status).toBe(401);
        expect(res.body.message).toMatch(/invalid credentials/i);
    });

    it('returns 401 for unknown email', async () => {
        const res = await request(app).post('/api/auth/login').send({
            email: 'nobody@test.com',
            password: 'pass123',
        });

        expect(res.status).toBe(401);
    });

    it('returns 400 when body is empty', async () => {
        const res = await request(app).post('/api/auth/login').send({});
        expect(res.status).toBe(400);
    });
});

describe('GET /api/auth/me', () => {
    it('returns the authenticated user profile', async () => {
        const { body: { token } } = await request(app).post('/api/auth/register').send({
            name: 'Alice',
            email: 'alice@test.com',
            password: 'pass123',
        });

        const res = await request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.user.email).toBe('alice@test.com');
        expect(res.body.user).not.toHaveProperty('password');
    });

    it('returns 401 without a token', async () => {
        const res = await request(app).get('/api/auth/me');
        expect(res.status).toBe(401);
    });

    it('returns 401 with a malformed token', async () => {
        const res = await request(app)
            .get('/api/auth/me')
            .set('Authorization', 'Bearer notavalidtoken');
        expect(res.status).toBe(401);
    });
});
