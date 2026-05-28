const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema(
    {
        name: { type: String, required: true, trim: true },
        owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        description: { type: String, trim: true },
        address: { type: String, required: true, trim: true },
        cuisine: [{ type: String, trim: true }],
        rating: { type: Number, default: 0, min: 0, max: 5 },
        image: { type: String },
        isOpen: { type: Boolean, default: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model('Restaurant', restaurantSchema);
