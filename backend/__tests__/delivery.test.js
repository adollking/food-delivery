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

let ownerToken, customerToken, driverToken, driverUser;
let restaurant, menuItem, order;

beforeEach(async () => {
    await clearDatabase();
    ({ token: ownerToken } = await registerUser({ role: 'restaurant_owner' }));
    ({ token: customerToken } = await registerUser({ role: 'customer' }));
    ({ token: driverToken, user: driverUser } = await registerUser({ role: 'driver' }));

    restaurant = await createRestaurant(ownerToken);
    menuItem = await createMenuItem(ownerToken, restaurant._id);
    order = await createOrder(customerToken, restaurant._id, menuItem._id);

    // Advance order to 'confirmed' so it can accept a delivery
    await advanceOrderStatus(ownerToken, order._id, 'confirmed');
});

describe('POST /api/deliveries', () => {
    it('assigns a driver to a confirmed order', async () => {
        const res = await request(app)
            .post('/api/deliveries')
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({ order: order._id, driver: driverUser.id });

        expect(res.status).toBe(201);
        expect(res.body.status).toBe('assigned');
        expect(res.body.driver.name).toBeDefined();
        expect(res.body.locationHistory).toEqual([]);
    });

    it('automatically sets order status to delivering', async () => {
        await request(app)
            .post('/api/deliveries')
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({ order: order._id, driver: driverUser.id });

        const orderRes = await request(app)
            .get(`/api/orders/${order._id}`)
            .set('Authorization', `Bearer ${customerToken}`);

        expect(orderRes.body.status).toBe('delivering');
    });

    it('returns 409 when a delivery already exists for the order', async () => {
        await request(app)
            .post('/api/deliveries')
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({ order: order._id, driver: driverUser.id });

        const res = await request(app)
            .post('/api/deliveries')
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({ order: order._id, driver: driverUser.id });

        expect(res.status).toBe(409);
    });

    it('returns 400 when the assigned user is not a driver', async () => {
        const { user: customer } = await registerUser({ role: 'customer' });
        const res = await request(app)
            .post('/api/deliveries')
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({ order: order._id, driver: customer.id });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/not a driver/i);
    });

    it('returns 400 when required fields are missing', async () => {
        const res = await request(app)
            .post('/api/deliveries')
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({ order: order._id });

        expect(res.status).toBe(400);
    });
});

describe('GET /api/deliveries/order/:orderId', () => {
    let delivery;

    beforeEach(async () => {
        const res = await request(app)
            .post('/api/deliveries')
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({ order: order._id, driver: driverUser.id });
        delivery = res.body;
    });

    it('allows the customer to track their own delivery', async () => {
        const res = await request(app)
            .get(`/api/deliveries/order/${order._id}`)
            .set('Authorization', `Bearer ${customerToken}`);

        expect(res.status).toBe(200);
        expect(res.body._id).toBe(delivery._id);
        expect(res.body.driver.name).toBeDefined();
    });

    it("returns 403 when a customer tracks another customer's order", async () => {
        const { token: otherToken } = await registerUser({ role: 'customer' });
        const res = await request(app)
            .get(`/api/deliveries/order/${order._id}`)
            .set('Authorization', `Bearer ${otherToken}`);

        expect(res.status).toBe(403);
    });

    it('returns 404 for an order with no delivery', async () => {
        const order2 = await createOrder(customerToken, restaurant._id, menuItem._id);
        const res = await request(app)
            .get(`/api/deliveries/order/${order2._id}`)
            .set('Authorization', `Bearer ${customerToken}`);

        expect(res.status).toBe(404);
    });
});

describe('GET /api/deliveries/my', () => {
    it('returns deliveries assigned to the driver', async () => {
        await request(app)
            .post('/api/deliveries')
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({ order: order._id, driver: driverUser.id });

        const res = await request(app)
            .get('/api/deliveries/my')
            .set('Authorization', `Bearer ${driverToken}`);

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(1);
    });
});

describe('PATCH /api/deliveries/:id/location', () => {
    let delivery;

    beforeEach(async () => {
        const res = await request(app)
            .post('/api/deliveries')
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({ order: order._id, driver: driverUser.id });
        delivery = res.body;
    });

    it('saves the driver location and appends to history', async () => {
        const res = await request(app)
            .patch(`/api/deliveries/${delivery._id}/location`)
            .set('Authorization', `Bearer ${driverToken}`)
            .send({ lat: -6.2088, lng: 106.8456, address: 'Jl. Sudirman' });

        expect(res.status).toBe(200);
        expect(res.body.currentLocation.lat).toBe(-6.2088);
        expect(res.body.currentLocation.lng).toBe(106.8456);

        // Verify history is populated
        const tracking = await request(app)
            .get(`/api/deliveries/order/${order._id}`)
            .set('Authorization', `Bearer ${customerToken}`);
        expect(tracking.body.locationHistory).toHaveLength(1);
    });

    it('returns 400 when lat/lng are missing', async () => {
        const res = await request(app)
            .patch(`/api/deliveries/${delivery._id}/location`)
            .set('Authorization', `Bearer ${driverToken}`)
            .send({ address: 'Somewhere' });

        expect(res.status).toBe(400);
    });

    it('returns 403 when a non-assigned driver updates location', async () => {
        const { token: otherDriver } = await registerUser({ role: 'driver' });
        const res = await request(app)
            .patch(`/api/deliveries/${delivery._id}/location`)
            .set('Authorization', `Bearer ${otherDriver}`)
            .send({ lat: -6.2, lng: 106.8 });

        expect(res.status).toBe(403);
    });
});

describe('PATCH /api/deliveries/:id/status', () => {
    let delivery;

    beforeEach(async () => {
        const res = await request(app)
            .post('/api/deliveries')
            .set('Authorization', `Bearer ${ownerToken}`)
            .send({ order: order._id, driver: driverUser.id });
        delivery = res.body;
    });

    it('advances through the full status chain and syncs order on delivered', async () => {
        const steps = ['picked_up', 'on_the_way', 'arrived'];
        for (const status of steps) {
            const res = await request(app)
                .patch(`/api/deliveries/${delivery._id}/status`)
                .set('Authorization', `Bearer ${driverToken}`)
                .send({ status });
            expect(res.status).toBe(200);
            expect(res.body.status).toBe(status);
        }

        const delivered = await request(app)
            .patch(`/api/deliveries/${delivery._id}/status`)
            .set('Authorization', `Bearer ${driverToken}`)
            .send({ status: 'delivered' });
        expect(delivered.body.status).toBe('delivered');
        expect(delivered.body.deliveredAt).toBeDefined();

        // Order must also be delivered
        const orderRes = await request(app)
            .get(`/api/orders/${order._id}`)
            .set('Authorization', `Bearer ${customerToken}`);
        expect(orderRes.body.status).toBe('delivered');
    });

    it('returns 400 for an invalid status transition', async () => {
        const res = await request(app)
            .patch(`/api/deliveries/${delivery._id}/status`)
            .set('Authorization', `Bearer ${driverToken}`)
            .send({ status: 'delivered' });

        expect(res.status).toBe(400);
        expect(res.body.message).toMatch(/cannot transition/i);
    });
});
