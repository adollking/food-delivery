const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema(
    {
        lat: { type: Number, required: true },
        lng: { type: Number, required: true },
        address: { type: String },
        timestamp: { type: Date, default: Date.now },
    },
    { _id: false }
);

const deliverySchema = new mongoose.Schema(
    {
        order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true, unique: true },
        driver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        status: {
            type: String,
            enum: ['assigned', 'picked_up', 'on_the_way', 'arrived', 'delivered'],
            default: 'assigned',
        },
        currentLocation: locationSchema,
        locationHistory: [locationSchema],
        estimatedArrival: { type: Date },
        pickedUpAt: { type: Date },
        deliveredAt: { type: Date },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Delivery', deliverySchema);
