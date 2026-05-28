const express = require('express');
const router = express.Router();
const { Product } = require('../models/productsModels');
const { protect, requireRole } = require('../middleware/auth');

router.get('/', async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/', protect, requireRole('admin'), async (req, res) => {
    try {
        const product = await Product.create(req.body);
        res.status(201).json(product);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
