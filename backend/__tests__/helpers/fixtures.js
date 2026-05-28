const request = require('supertest');
const app = require('../../app');

// Unique email per call so tests never collide on duplicate email
const email = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}@test.com`;

const registerUser = async (overrides = {}) => {
    const payload = {
        name: 'Test User',
        email: email('user'),
        password: 'password123',
        role: 'customer',
        ...overrides,
    };
    const res = await request(app).post('/api/auth/register').send(payload);
    return { token: res.body.token, user: res.body.user, email: payload.email, password: payload.password };
};

const createRestaurant = async (token, overrides = {}) => {
    const res = await request(app)
        .post('/api/restaurants')
        .set('Authorization', `Bearer ${token}`)
        .send({
            name: 'Test Restaurant',
            address: 'Jl. Test No. 1, Jakarta',
            cuisine: ['Indonesian'],
            ...overrides,
        });
    return res.body;
};

const createMenuItem = async (token, restaurantId, overrides = {}) => {
    const res = await request(app)
        .post('/api/menu-items')
        .set('Authorization', `Bearer ${token}`)
        .send({
            name: 'Test Item',
            price: 25000,
            category: 'Main Course',
            restaurant: restaurantId,
            ...overrides,
        });
    return res.body;
};

const createOrder = async (token, restaurantId, menuItemId, overrides = {}) => {
    const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
            restaurant: restaurantId,
            items: [{ menuItem: menuItemId, quantity: 1 }],
            deliveryAddress: 'Jl. Delivery No. 5, Jakarta',
            ...overrides,
        });
    return res.body;
};

const advanceOrderStatus = async (token, orderId, status) => {
    const res = await request(app)
        .patch(`/api/orders/${orderId}/status`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status });
    return res.body;
};

module.exports = { registerUser, createRestaurant, createMenuItem, createOrder, advanceOrderStatus };
