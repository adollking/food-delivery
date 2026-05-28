const mongoose = require('mongoose');

const requestLogSchema = new mongoose.Schema({
    method:       { type: String, required: true },
    path:         { type: String, required: true },
    statusCode:   { type: Number },
    responseTime: { type: Number },   // ms
    ip:           { type: String },
    userAgent:    { type: String },
    userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    userEmail:    { type: String, default: null },
    userRole:     { type: String, default: null },
    createdAt:    { type: Date, default: Date.now },
});

// Auto-delete logs older than 30 days
requestLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });

// Fast queries by user and path
requestLogSchema.index({ userId: 1 });
requestLogSchema.index({ path: 1, method: 1 });

module.exports = mongoose.model('RequestLog', requestLogSchema);
