const request = require('supertest');
const app = require('../app');
const { connect, disconnect, clearDatabase } = require('./helpers/db');
const { registerUser, createRestaurant } = require('./helpers/fixtures');

beforeAll(async () => await connect());
afterAll(async () => await disconnect());
beforeEach(async () => await clearDatabase());

describe('GET /api/restaurants', () => {
    it('returns empty array when no restaurants exist', async () => {
        const res = await request(app).get('/api/restaurants');
        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });

    it('returns all restaurants without auth', async () => {
        const { token } = await registerUser({ role: 'restaurant_owner' });
        await createRestaurant(token, { name: 'Resto A' });
        await createRestaurant(token, { name: 'Resto B' });

        const res = await request(app).get('/api/restaurants');
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(2);
    });
});

describe('GET /api/restaurants/:id', () => {
    it('returns a single restaurant', async () => {
        const { token } = await registerUser({ role: 'restaurant_owner' });
        const restaurant = await createRestaurant(token);

        const res = await request(app).get(`/api/restaurants/${restaurant._id}`);
        expect(res.status).toBe(200);
        expect(res.body._id).toBe(restaurant._id);
        expect(res.body.name).toBe('Test Restaurant');
    });

    it('returns 404 for a non-existent id', async () => {
        const res = await request(app).get('/api/restaurants/64b1c2d3e4f5a6b7c8d9e0f1');
        expect(res.status).toBe(404);
    });
});

describe('POST /api/restaurants', () => {
    it('creates a restaurant as restaurant_owner', async () => {
        const { token } = await registerUser({ role: 'restaurant_owner' });
        const res = await request(app)
            .post('/api/restaurants')
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'My Resto', address: 'Jl. Test 1', cuisine: ['Indonesian'] });

        expect(res.status).toBe(201);
        expect(res.body.name).toBe('My Resto');
        expect(res.body.rating).toBe(0);
    });

    it('returns 403 when a customer tries to create', async () => {
        const { token } = await registerUser({ role: 'customer' });
        const res = await request(app)
            .post('/api/restaurants')
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'My Resto', address: 'Jl. Test 1' });

        expect(res.status).toBe(403);
    });

    it('returns 401 without a token', async () => {
        const res = await request(app)
            .post('/api/restaurants')
            .send({ name: 'My Resto', address: 'Jl. Test 1' });

        expect(res.status).toBe(401);
    });
});

describe('PUT /api/restaurants/:id', () => {
    it('allows the owner to update their restaurant', async () => {
        const { token } = await registerUser({ role: 'restaurant_owner' });
        const restaurant = await createRestaurant(token);

        const res = await request(app)
            .put(`/api/restaurants/${restaurant._id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Updated Name', isOpen: false });

        expect(res.status).toBe(200);
        expect(res.body.name).toBe('Updated Name');
        expect(res.body.isOpen).toBe(false);
    });

    it('returns 403 when a different user tries to update', async () => {
        const { token: ownerToken } = await registerUser({ role: 'restaurant_owner' });
        const { token: otherToken } = await registerUser({ role: 'restaurant_owner' });
        const restaurant = await createRestaurant(ownerToken);

        const res = await request(app)
            .put(`/api/restaurants/${restaurant._id}`)
            .set('Authorization', `Bearer ${otherToken}`)
            .send({ name: 'Hacked' });

        expect(res.status).toBe(403);
    });
});

describe('DELETE /api/restaurants/:id', () => {
    it('allows the owner to delete their restaurant', async () => {
        const { token } = await registerUser({ role: 'restaurant_owner' });
        const restaurant = await createRestaurant(token);

        const res = await request(app)
            .delete(`/api/restaurants/${restaurant._id}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/deleted/i);

        const check = await request(app).get(`/api/restaurants/${restaurant._id}`);
        expect(check.status).toBe(404);
    });

    it('returns 403 when a non-owner tries to delete', async () => {
        const { token: ownerToken } = await registerUser({ role: 'restaurant_owner' });
        const { token: otherToken } = await registerUser({ role: 'restaurant_owner' });
        const restaurant = await createRestaurant(ownerToken);

        const res = await request(app)
            .delete(`/api/restaurants/${restaurant._id}`)
            .set('Authorization', `Bearer ${otherToken}`);

        expect(res.status).toBe(403);
    });
});
