const express = require('express');
const router = express.Router();
const RequestLog = require('../models/requestLogModel');
const { protect, requireRole } = require('../middleware/auth');

// GET /api/logs
// Query params: userId, method, path, statusCode, from, to, page (default 1), limit (default 50)
router.get('/', protect, requireRole('admin'), async (req, res) => {
    const { userId, method, path: urlPath, statusCode, from, to, page = 1, limit = 50 } = req.query;

    const filter = {};
    if (userId)     filter.userId = userId;
    if (method)     filter.method = method.toUpperCase();
    if (urlPath)    filter.path = { $regex: urlPath, $options: 'i' };
    if (statusCode) filter.statusCode = Number(statusCode);
    if (from || to) {
        filter.createdAt = {};
        if (from) filter.createdAt.$gte = new Date(from);
        if (to)   filter.createdAt.$lte = new Date(to);
    }

    try {
        const [logs, total] = await Promise.all([
            RequestLog.find(filter)
                .populate('userId', 'name email role')
                .sort('-createdAt')
                .skip((page - 1) * limit)
                .limit(Number(limit)),
            RequestLog.countDocuments(filter),
        ]);

        res.json({
            total,
            page: Number(page),
            pages: Math.ceil(total / limit),
            logs,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET /api/logs/stats
// Top routes, top users, error rate summary
router.get('/stats', protect, requireRole('admin'), async (req, res) => {
    try {
        const [topRoutes, topUsers, statusBreakdown] = await Promise.all([
            RequestLog.aggregate([
                { $group: { _id: { method: '$method', path: '$path' }, count: { $sum: 1 }, avgMs: { $avg: '$responseTime' } } },
                { $sort: { count: -1 } },
                { $limit: 10 },
            ]),
            RequestLog.aggregate([
                { $match: { userId: { $ne: null } } },
                { $group: { _id: '$userId', email: { $first: '$userEmail' }, role: { $first: '$userRole' }, count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 },
            ]),
            RequestLog.aggregate([
                { $group: { _id: '$statusCode', count: { $sum: 1 } } },
                { $sort: { _id: 1 } },
            ]),
        ]);

        res.json({ topRoutes, topUsers, statusBreakdown });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
