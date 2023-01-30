const express = require('express');
const router = express.Router();
const Product = require('../models/productsModels');

// GET all products
router.get('/products', (req, res) => {
    Product.find()
        .then(products => res.json(products))
        .catch(err => res.status(400).json('Error: ' + err));
})
