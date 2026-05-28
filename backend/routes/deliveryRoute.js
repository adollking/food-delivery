const express = require('express');
const router = express.Router();
const {
    assignDelivery,
    updateLocation,
    updateStatus,
    getByOrder,
    getMyDeliveries,
} = require('../controllers/deliveryController');
const { protect, requireRole } = require('../middleware/auth');

router.post('/', protect, requireRole('restaurant_owner', 'admin'), assignDelivery);
router.get('/my', protect, requireRole('driver'), getMyDeliveries);
router.get('/order/:orderId', protect, getByOrder);
router.patch('/:id/location', protect, requireRole('driver'), updateLocation);
router.patch('/:id/status', protect, requireRole('driver', 'admin'), updateStatus);

module.exports = router;
