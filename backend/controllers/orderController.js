const Order = require('../models/orderModel');
const MenuItem = require('../models/menuItemModel');

const ALLOWED_STATUS_TRANSITIONS = {
    pending: ['confirmed', 'cancelled'],
    confirmed: ['preparing', 'cancelled'],
    preparing: ['delivering'],
    delivering: ['delivered'],
};

const createOrder = async (req, res) => {
    const { restaurant, items, deliveryAddress, note } = req.body;
    if (!restaurant || !items?.length || !deliveryAddress) {
        return res.status(400).json({ message: 'restaurant, items, and deliveryAddress are required' });
    }

    try {
        const menuItems = await MenuItem.find({ _id: { $in: items.map(i => i.menuItem) } });
        if (menuItems.length !== items.length) {
            return res.status(400).json({ message: 'One or more menu items not found' });
        }

        const orderItems = items.map(i => {
            const found = menuItems.find(m => m._id.toString() === i.menuItem);
            return { menuItem: found._id, name: found.name, price: found.price, quantity: i.quantity };
        });

        const totalAmount = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);

        const order = await Order.create({
            customer: req.user._id,
            restaurant,
            items: orderItems,
            totalAmount,
            deliveryAddress,
            note,
        });

        res.status(201).json(order);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const getMyOrders = async (req, res) => {
    try {
        const orders = await Order.find({ customer: req.user._id })
            .populate('restaurant', 'name address')
            .sort('-createdAt');
        res.json(orders);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const getRestaurantOrders = async (req, res) => {
    try {
        const orders = await Order.find({ restaurant: req.params.restaurantId })
            .populate('customer', 'name email phone')
            .sort('-createdAt');
        res.json(orders);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const getOne = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('customer', 'name email')
            .populate('restaurant', 'name address');
        if (!order) return res.status(404).json({ message: 'Order not found' });

        const isCustomer = order.customer._id.toString() === req.user._id.toString();
        if (!isCustomer && req.user.role === 'customer') {
            return res.status(403).json({ message: 'Access denied' });
        }

        res.json(order);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const updateStatus = async (req, res) => {
    const { status } = req.body;
    try {
        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found' });

        const allowed = ALLOWED_STATUS_TRANSITIONS[order.status] || [];
        if (!allowed.includes(status)) {
            return res.status(400).json({
                message: `Cannot transition from '${order.status}' to '${status}'`,
            });
        }

        order.status = status;
        await order.save();
        res.json(order);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = { createOrder, getMyOrders, getRestaurantOrders, getOne, updateStatus };
