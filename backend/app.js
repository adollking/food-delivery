require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const { httpLogger, apiLogger } = require('./middleware/logger');

const authRoute       = require('./routes/authRoute');
const restaurantRoute = require('./routes/restaurantRoute');
const menuItemRoute   = require('./routes/menuItemRoute');
const orderRoute      = require('./routes/orderRoute');
const productsRoute   = require('./routes/productsRoute');
const deliveryRoute   = require('./routes/deliveryRoute');
const logsRoute       = require('./routes/logsRoute');

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

// Skip logging in test environment — avoids file noise and async DB writes
// racing with per-test database cleanup
if (process.env.NODE_ENV !== 'test') {
    app.use(httpLogger);
    app.use(apiLogger);
}

app.use('/api/auth',        authRoute);
app.use('/api/restaurants', restaurantRoute);
app.use('/api/menu-items',  menuItemRoute);
app.use('/api/orders',      orderRoute);
app.use('/api/products',    productsRoute);
app.use('/api/deliveries',  deliveryRoute);
app.use('/api/logs',        logsRoute);

app.use((req, res) => res.status(404).json({ message: 'Route not found' }));

app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Internal server error' });
});

module.exports = app;
