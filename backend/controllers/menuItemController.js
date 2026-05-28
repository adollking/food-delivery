const MenuItem = require('../models/menuItemModel');
const Restaurant = require('../models/restaurantModel');

const getByRestaurant = async (req, res) => {
    try {
        const items = await MenuItem.find({ restaurant: req.params.restaurantId });
        res.json(items);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const getOne = async (req, res) => {
    try {
        const item = await MenuItem.findById(req.params.id).populate('restaurant', 'name');
        if (!item) return res.status(404).json({ message: 'Menu item not found' });
        res.json(item);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const create = async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.body.restaurant);
        if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });

        const isOwner = restaurant.owner.toString() === req.user._id.toString();
        if (!isOwner && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }

        const item = await MenuItem.create(req.body);
        res.status(201).json(item);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const update = async (req, res) => {
    try {
        const item = await MenuItem.findById(req.params.id).populate('restaurant');
        if (!item) return res.status(404).json({ message: 'Menu item not found' });

        const isOwner = item.restaurant.owner.toString() === req.user._id.toString();
        if (!isOwner && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }

        const updated = await MenuItem.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const remove = async (req, res) => {
    try {
        const item = await MenuItem.findById(req.params.id).populate('restaurant');
        if (!item) return res.status(404).json({ message: 'Menu item not found' });

        const isOwner = item.restaurant.owner.toString() === req.user._id.toString();
        if (!isOwner && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }

        await item.deleteOne();
        res.json({ message: 'Menu item deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = { getByRestaurant, getOne, create, update, remove };
