const express = require('express');
const router = express.Router();
const { getAll, getOne, create, update, remove } = require('../controllers/restaurantController');
const { protect, requireRole } = require('../middleware/auth');

router.get('/', getAll);
router.get('/:id', getOne);
router.post('/', protect, requireRole('restaurant_owner', 'admin'), create);
router.put('/:id', protect, requireRole('restaurant_owner', 'admin'), update);
router.delete('/:id', protect, requireRole('restaurant_owner', 'admin'), remove);

module.exports = router;
