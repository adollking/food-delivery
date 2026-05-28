const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
    menuItem: { type: mongoose.Schema.Types.ObjectId, ref: 'MenuItem', required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
});

const orderSchema = new mongoose.Schema(
    {
        customer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        restaurant: { type: mongoose.Schema.Types.ObjectId, ref: 'Restaurant', required: true },
        items: [orderItemSchema],
        status: {
            type: String,
            enum: ['pending', 'confirmed', 'preparing', 'delivering', 'delivered', 'cancelled'],
            default: 'pending',
        },
        totalAmount: { type: Number, required: true, min: 0 },
        deliveryAddress: { type: String, required: true },
        note: { type: String },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
