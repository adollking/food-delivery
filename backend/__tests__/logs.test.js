const request = require('supertest');
const app = require('../app');
const { connect, disconnect, clearDatabase } = require('./helpers/db');
const { registerUser } = require('./helpers/fixtures');
const RequestLog = require('../models/requestLogModel');

beforeAll(async () => await connect());
afterAll(async () => await disconnect());
beforeEach(async () => await clearDatabase());

const seedLogs = async (userId) => {
    await RequestLog.insertMany([
        { method: 'GET',  path: '/api/restaurants', statusCode: 200, responseTime: 45, userId, userEmail: 'admin@test.com', userRole: 'admin' },
        { method: 'POST', path: '/api/auth/login',  statusCode: 401, responseTime: 88, userId: null, userEmail: null, userRole: null },
        { method: 'POST', path: '/api/orders',      statusCode: 201, responseTime: 210, userId, userEmail: 'admin@test.com', userRole: 'admin' },
    ]);
};

describe('GET /api/logs', () => {
    it('returns paginated logs for an admin', async () => {
        const { token, user } = await registerUser({ role: 'admin' });
        await seedLogs(user.id);

        const res = await request(app)
            .get('/api/logs')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.total).toBe(3);
        expect(res.body.logs).toHaveLength(3);
        expect(res.body.page).toBe(1);
        expect(res.body.pages).toBe(1);
    });

    it('filters by statusCode', async () => {
        const { token, user } = await registerUser({ role: 'admin' });
        await seedLogs(user.id);

        const res = await request(app)
            .get('/api/logs?statusCode=401')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.total).toBe(1);
        expect(res.body.logs[0].statusCode).toBe(401);
    });

    it('filters by method', async () => {
        const { token, user } = await registerUser({ role: 'admin' });
        await seedLogs(user.id);

        const res = await request(app)
            .get('/api/logs?method=POST')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.total).toBe(2);
    });

    it('filters by path substring', async () => {
        const { token, user } = await registerUser({ role: 'admin' });
        await seedLogs(user.id);

        const res = await request(app)
            .get('/api/logs?path=auth')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.total).toBe(1);
        expect(res.body.logs[0].path).toContain('auth');
    });

    it('returns 403 for a non-admin user', async () => {
        const { token } = await registerUser({ role: 'customer' });
        const res = await request(app)
            .get('/api/logs')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(403);
    });

    it('returns 401 without a token', async () => {
        const res = await request(app).get('/api/logs');
        expect(res.status).toBe(401);
    });
});

describe('GET /api/logs/stats', () => {
    it('returns topRoutes, topUsers, and statusBreakdown', async () => {
        const { token, user } = await registerUser({ role: 'admin' });
        await seedLogs(user.id);

        const res = await request(app)
            .get('/api/logs/stats')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('topRoutes');
        expect(res.body).toHaveProperty('topUsers');
        expect(res.body).toHaveProperty('statusBreakdown');
        expect(res.body.statusBreakdown.length).toBeGreaterThan(0);
    });

    it('returns 403 for a non-admin user', async () => {
        const { token } = await registerUser({ role: 'restaurant_owner' });
        const res = await request(app)
            .get('/api/logs/stats')
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(403);
    });
});
