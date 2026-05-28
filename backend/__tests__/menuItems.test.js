const request = require('supertest');
const app = require('../app');
const { connect, disconnect, clearDatabase } = require('./helpers/db');
const { registerUser, createRestaurant, createMenuItem } = require('./helpers/fixtures');

beforeAll(async () => await connect());
afterAll(async () => await disconnect());
beforeEach(async () => await clearDatabase());

describe('GET /api/menu-items/restaurant/:restaurantId', () => {
    it('returns items for a restaurant without auth', async () => {
        const { token } = await registerUser({ role: 'restaurant_owner' });
        const restaurant = await createRestaurant(token);
        await createMenuItem(token, restaurant._id, { name: 'Nasi Goreng' });
        await createMenuItem(token, restaurant._id, { name: 'Mie Ayam' });

        const res = await request(app).get(`/api/menu-items/restaurant/${restaurant._id}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(2);
    });

    it('returns empty array for a restaurant with no items', async () => {
        const { token } = await registerUser({ role: 'restaurant_owner' });
        const restaurant = await createRestaurant(token);

        const res = await request(app).get(`/api/menu-items/restaurant/${restaurant._id}`);
        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });
});

describe('GET /api/menu-items/:id', () => {
    it('returns a single menu item', async () => {
        const { token } = await registerUser({ role: 'restaurant_owner' });
        const restaurant = await createRestaurant(token);
        const item = await createMenuItem(token, restaurant._id, { name: 'Sate Ayam', price: 30000 });

        const res = await request(app).get(`/api/menu-items/${item._id}`);
        expect(res.status).toBe(200);
        expect(res.body.name).toBe('Sate Ayam');
        expect(res.body.price).toBe(30000);
    });

    it('returns 404 for a non-existent id', async () => {
        const res = await request(app).get('/api/menu-items/64b1c2d3e4f5a6b7c8d9e0f1');
        expect(res.status).toBe(404);
    });
});

describe('POST /api/menu-items', () => {
    it('allows the restaurant owner to create a menu item', async () => {
        const { token } = await registerUser({ role: 'restaurant_owner' });
        const restaurant = await createRestaurant(token);

        const res = await request(app)
            .post('/api/menu-items')
            .set('Authorization', `Bearer ${token}`)
            .send({
                name: 'Rendang',
                price: 45000,
                category: 'Main Course',
                restaurant: restaurant._id,
            });

        expect(res.status).toBe(201);
        expect(res.body.name).toBe('Rendang');
        expect(res.body.price).toBe(45000);
        expect(res.body.isAvailable).toBe(true);
    });

    it('returns 403 when a non-owner tries to add items to a restaurant', async () => {
        const { token: ownerToken } = await registerUser({ role: 'restaurant_owner' });
        const { token: otherToken } = await registerUser({ role: 'restaurant_owner' });
        const restaurant = await createRestaurant(ownerToken);

        const res = await request(app)
            .post('/api/menu-items')
            .set('Authorization', `Bearer ${otherToken}`)
            .send({ name: 'Hack Item', price: 1, category: 'Other', restaurant: restaurant._id });

        expect(res.status).toBe(403);
    });

    it('returns 404 when the restaurant does not exist', async () => {
        const { token } = await registerUser({ role: 'restaurant_owner' });
        const res = await request(app)
            .post('/api/menu-items')
            .set('Authorization', `Bearer ${token}`)
            .send({ name: 'Item', price: 10000, category: 'Test', restaurant: '64b1c2d3e4f5a6b7c8d9e0f1' });

        expect(res.status).toBe(404);
    });
});

describe('PUT /api/menu-items/:id', () => {
    it('allows the owner to update a menu item', async () => {
        const { token } = await registerUser({ role: 'restaurant_owner' });
        const restaurant = await createRestaurant(token);
        const item = await createMenuItem(token, restaurant._id);

        const res = await request(app)
            .put(`/api/menu-items/${item._id}`)
            .set('Authorization', `Bearer ${token}`)
            .send({ price: 99000, isAvailable: false });

        expect(res.status).toBe(200);
        expect(res.body.price).toBe(99000);
        expect(res.body.isAvailable).toBe(false);
    });
});

describe('DELETE /api/menu-items/:id', () => {
    it('allows the owner to delete a menu item', async () => {
        const { token } = await registerUser({ role: 'restaurant_owner' });
        const restaurant = await createRestaurant(token);
        const item = await createMenuItem(token, restaurant._id);

        const res = await request(app)
            .delete(`/api/menu-items/${item._id}`)
            .set('Authorization', `Bearer ${token}`);

        expect(res.status).toBe(200);

        const check = await request(app).get(`/api/menu-items/${item._id}`);
        expect(check.status).toBe(404);
    });
});
