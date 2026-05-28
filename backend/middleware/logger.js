const morgan = require('morgan');
const winston = require('winston');
const path = require('path');
const RequestLog = require('../models/requestLogModel');

// ── Winston: writes to console + rotating log files ──────────────────────────
const winstonLogger = winston.createLogger({
    level: 'http',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message }) =>
            `[${timestamp}] ${level.toUpperCase()}: ${message}`
        )
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(({ level, message }) => `${level}: ${message}`)
            ),
        }),
        new winston.transports.File({
            filename: path.join(__dirname, '../logs/error.log'),
            level: 'error',
        }),
        new winston.transports.File({
            filename: path.join(__dirname, '../logs/access.log'),
        }),
    ],
});

// ── Morgan: short format piped into winston ───────────────────────────────────
const httpLogger = morgan(
    ':method :url :status :res[content-length] - :response-time ms',
    { stream: { write: (msg) => winstonLogger.http(msg.trim()) } }
);

// ── API logger: saves every request to MongoDB ───────────────────────────────
// Registered early so the timer starts immediately; the res.on('finish')
// callback fires after all middleware ran (including auth), so req.user is set.
const apiLogger = (req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
        // Skip logging the /api/logs endpoint itself to avoid feedback loop
        if (req.path.startsWith('/api/logs')) return;

        const responseTime = Date.now() - start;

        RequestLog.create({
            method:       req.method,
            path:         req.path,
            statusCode:   res.statusCode,
            responseTime,
            ip:           req.ip || req.socket?.remoteAddress,
            userAgent:    req.get('User-Agent'),
            userId:       req.user?._id   ?? null,
            userEmail:    req.user?.email ?? null,
            userRole:     req.user?.role  ?? null,
        }).catch((err) => winstonLogger.error(`Failed to save request log: ${err.message}`));
    });

    next();
};

module.exports = { httpLogger, apiLogger, winstonLogger };
