const Restaurant = require('../models/restaurantModel');

const getAll = async (req, res) => {
    try {
        const restaurants = await Restaurant.find().populate('owner', 'name email');
        res.json(restaurants);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const getOne = async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.params.id).populate('owner', 'name email');
        if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });
        res.json(restaurant);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const create = async (req, res) => {
    try {
        const restaurant = await Restaurant.create({ ...req.body, owner: req.user._id });
        res.status(201).json(restaurant);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const update = async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.params.id);
        if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });

        const isOwner = restaurant.owner.toString() === req.user._id.toString();
        if (!isOwner && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }

        const updated = await Restaurant.findByIdAndUpdate(req.params.id, req.body, { new: true });
        res.json(updated);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const remove = async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.params.id);
        if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });

        const isOwner = restaurant.owner.toString() === req.user._id.toString();
        if (!isOwner && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied' });
        }

        await restaurant.deleteOne();
        res.json({ message: 'Restaurant deleted' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = { getAll, getOne, create, update, remove };
