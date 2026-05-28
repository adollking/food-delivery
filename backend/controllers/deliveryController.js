const Delivery = require('../models/deliveryModel');
const Order = require('../models/orderModel');
const User = require('../models/userModel');

const STATUS_TRANSITIONS = {
    assigned: ['picked_up'],
    picked_up: ['on_the_way'],
    on_the_way: ['arrived'],
    arrived: ['delivered'],
};

// POST /api/deliveries
// Assign a driver to an order (admin / restaurant_owner)
const assignDelivery = async (req, res) => {
    const { order: orderId, driver: driverId, estimatedArrival } = req.body;
    if (!orderId || !driverId) {
        return res.status(400).json({ message: 'order and driver are required' });
    }

    try {
        const [order, driver] = await Promise.all([
            Order.findById(orderId),
            User.findById(driverId),
        ]);

        if (!order) return res.status(404).json({ message: 'Order not found' });
        if (!driver) return res.status(404).json({ message: 'Driver not found' });
        if (driver.role !== 'driver') {
            return res.status(400).json({ message: 'User is not a driver' });
        }
        if (!['confirmed', 'preparing'].includes(order.status)) {
            return res.status(400).json({ message: 'Order must be confirmed or preparing before assigning delivery' });
        }

        const existing = await Delivery.findOne({ order: orderId });
        if (existing) return res.status(409).json({ message: 'Delivery already assigned for this order' });

        const delivery = await Delivery.create({
            order: orderId,
            driver: driverId,
            estimatedArrival,
        });

        await Order.findByIdAndUpdate(orderId, { status: 'delivering' });

        await delivery.populate([
            { path: 'order', select: 'deliveryAddress totalAmount status' },
            { path: 'driver', select: 'name phone' },
        ]);

        res.status(201).json(delivery);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// PATCH /api/deliveries/:id/location
// Driver updates their current GPS position
const updateLocation = async (req, res) => {
    const { lat, lng, address } = req.body;
    if (lat == null || lng == null) {
        return res.status(400).json({ message: 'lat and lng are required' });
    }

    try {
        const delivery = await Delivery.findById(req.params.id);
        if (!delivery) return res.status(404).json({ message: 'Delivery not found' });
        if (delivery.driver.toString() !== req.user._id.toString()) {
            return res.status(403).json({ message: 'Access denied' });
        }
        if (delivery.status === 'delivered') {
            return res.status(400).json({ message: 'Delivery is already completed' });
        }

        const locationPoint = { lat, lng, address, timestamp: new Date() };
        delivery.currentLocation = locationPoint;
        delivery.locationHistory.push(locationPoint);
        await delivery.save();

        res.json({
            deliveryId: delivery._id,
            currentLocation: delivery.currentLocation,
            status: delivery.status,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// PATCH /api/deliveries/:id/status
// Driver advances the delivery status
const updateStatus = async (req, res) => {
    const { status } = req.body;
    if (!status) return res.status(400).json({ message: 'status is required' });

    try {
        const delivery = await Delivery.findById(req.params.id);
        if (!delivery) return res.status(404).json({ message: 'Delivery not found' });
        if (delivery.driver.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }

        const allowed = STATUS_TRANSITIONS[delivery.status] || [];
        if (!allowed.includes(status)) {
            return res.status(400).json({
                message: `Cannot transition from '${delivery.status}' to '${status}'`,
            });
        }

        delivery.status = status;
        if (status === 'picked_up') delivery.pickedUpAt = new Date();
        if (status === 'delivered') {
            delivery.deliveredAt = new Date();
            await Order.findByIdAndUpdate(delivery.order, { status: 'delivered' });
        }

        await delivery.save();
        res.json(delivery);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// GET /api/deliveries/order/:orderId
// Track delivery for a specific order (customer sees own order only)
const getByOrder = async (req, res) => {
    try {
        const delivery = await Delivery.findOne({ order: req.params.orderId })
            .populate('driver', 'name phone')
            .populate('order', 'deliveryAddress totalAmount status customer');

        if (!delivery) return res.status(404).json({ message: 'No delivery found for this order' });

        if (req.user.role === 'customer') {
            const isOwner = delivery.order.customer.toString() === req.user._id.toString();
            if (!isOwner) return res.status(403).json({ message: 'Access denied' });
        }

        res.json(delivery);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

// GET /api/deliveries/my
// Driver fetches their own active deliveries
const getMyDeliveries = async (req, res) => {
    try {
        const deliveries = await Delivery.find({ driver: req.user._id })
            .populate('order', 'deliveryAddress totalAmount status items')
            .sort('-createdAt');
        res.json(deliveries);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = { assignDelivery, updateLocation, updateStatus, getByOrder, getMyDeliveries };
