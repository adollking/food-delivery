const express = require('express');
const router = express.Router();
const { createOrder, getMyOrders, getRestaurantOrders, getOne, updateStatus } = require('../controllers/orderController');
const { protect, requireRole } = require('../middleware/auth');

router.post('/', protect, requireRole('customer'), createOrder);
router.get('/my', protect, requireRole('customer'), getMyOrders);
router.get('/restaurant/:restaurantId', protect, requireRole('restaurant_owner', 'admin'), getRestaurantOrders);
router.get('/:id', protect, getOne);
router.patch('/:id/status', protect, requireRole('restaurant_owner', 'admin'), updateStatus);

module.exports = router;
