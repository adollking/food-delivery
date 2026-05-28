const request = require('supertest');
const app = require('../app');
const { connect, disconnect, clearDatabase } = require('./helpers/db');
const {
    registerUser,
    createRestaurant,
    createMenuItem,
    createOrder,
    advanceOrderStatus,
} = require('./helpers/fixtures');

beforeAll(async () => await connect());
afterAll(async () => await disconnect());

let ownerToken, customerToken, restaurant, menuItem;

beforeEach(async () => {
    await clearDatabase();
    ({ token: ownerToken } = await registerUser({ role: 'restaurant_owner' }));
    ({ token: customerToken } = await registerUser({ role: 'customer' }));
    restaurant = await createRestaurant(ownerToken);
    menuItem = await createMenuItem(ownerToken, restaurant._id, { price: 35000 });
});

describe('POST /api/orders', () => {
    it('creates an order and calculates total from menu item prices', async () => {
        const res = await request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${customerToken}`)
            .send({
                restaurant: restaurant._id,
                items: [{ menuItem: menuItem._id, quantity: 3 }],
                deliveryAddress: 'Jl. Test 1',
            });

        expect(res.status).toBe(201);
        expect(res.body.status).toBe('pending');
        expect(res.body.totalAmount).toBe(35000 * 3);
        expect(res.body.items[0].name).toBe(menuItem.name);
    });

    it('returns 400 when required fields are missing', async () => {
        const res = await request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${customerToken}`)
            .send({ restaurant: restaurant._id });

        expect(res.status).toBe(400);
    });

    it('returns 400 when a menu item does not exist', async () => {
        const res = await request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${customerToken}`)
            .send({
                restaurant: restaurant._id,
                items: [{ menuItem: '64b1c2d3e4f5a6b7c8d9e0f1', quantity: 1 }],
                deliveryAddress: 'Jl. Test 1',
            });

        expect(res.status).toBe(400);
    });

    it('returns 403 when a restaurant_owner tries to place an order', async () => {
        const res = await request(app)
            .post('/api/orders')
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({
                restaurant: restaurant._id,
                items: [{ menuItem: menuItem._id, quantity: 1 }],
                deliveryAddress: 'Jl. Test 1',
            });

        expect(res.status).toBe(403);
    });
});

describe('GET /api/orders/my', () => {
    it("returns only the authenticated customer's orders", async () => {
        const { token: otherToken } = await registerUser({ role: 'customer' });
        await createOrder(customerToken, restaurant._id, menuItem._id);
        await createOrder(otherToken, restaurant._id, menuItem._id);

        const res = await request(app)
            .get('/api/orders/my')
            .set('Authorization', `Bearer ${customerToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
    });
});

describe('GET /api/orders/restaurant/:restaurantId', () => {
    it('returns all orders for a restaurant', async () => {
        await createOrder(customerToken, restaurant._id, menuItem._id);
        await createOrder(customerToken, restaurant._id, menuItem._id);

        const res = await request(app)
            .get(`/api/orders/restaurant/${restaurant._id}`)
            .set('Authorization', `Bearer ${ownerToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(2);
    });
});

describe('GET /api/orders/:id', () => {
    it('allows a customer to view their own order', async () => {
        const order = await createOrder(customerToken, restaurant._id, menuItem._id);

        const res = await request(app)
            .get(`/api/orders/${order._id}`)
            .set('Authorization', `Bearer ${customerToken}`);

        expect(res.status).toBe(200);
    });

    it('returns 403 when a customer views another customer\'s order', async () => {
        const { token: otherToken } = await registerUser({ role: 'customer' });
        const order = await createOrder(otherToken, restaurant._id, menuItem._id);

        const res = await request(app)
            .get(`/api/orders/${order._id}`)
            .set('Authorization', `Bearer ${customerToken}`);

        expect(res.status).toBe(403);
    });
});

describe('PATCH /api/orders/:id/status', () => {
    it('advances status along the valid chain', async () => {
        const order = await createOrder(customerToken, restaurant._id, menuItem._id);

        const confirmed = await request(app)
            .patch(`/api/orders/${order._id}/status`)
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({ status: 'confirmed' });
        expect(confirmed.status).toBe(200);
        expect(confirmed.body.status).toBe('confirmed');

        const preparing = await request(app)
            .patch(`/api/orders/${order._id}/status`)
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({ status: 'preparing' });
        expect(preparing.body.status).toBe('preparing');
    });

    it('allows cancellation from pending', async () => {
        const order = await createOrder(customerToken, restaurant._id, menuItem._id);
        const res = await request(app)
            .patch(`/api/orders/${order._id}/status`)
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({ status: 'cancelled' });

        expect(res.status).toBe(200);
        expect(res.body.status).toBe('cancelled');
    });

    it('returns 400 for an invalid status transition', async () => {
        const order = await createOrder(customerToken, restaurant._id, menuItem._id);
        const res = await request(app)
            .patch(`/api/orders/${order._id}/status`)
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({ status: 'delivered' });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/cannot transition/i);
    });
});
