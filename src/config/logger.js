const winston = require('winston');
const config = require('./config');
const path = require('path');
const fs = require('fs');

const enumerateErrorFormat = winston.format((info) => {
  if (info instanceof Error) {
    Object.assign(info, { message: info.stack });
  }
  return info;
});

// Ensure /tmp/logs exists in Vercel
const logDir = process.env.VERCEL ? '/tmp/logs' : 'logs';
if (process.env.VERCEL) {
  try {
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  } catch (error) {
    console.error('Failed to create log directory:', error.message);
  }
}

const logger = winston.createLogger({
  level: config.env === 'development' ? 'debug' : 'info',
  format: winston.format.combine(
    enumerateErrorFormat(),
    winston.format.timestamp(),
    config.env === 'development' ? winston.format.colorize() : winston.format.uncolorize(),
    winston.format.splat(),
    winston.format.printf(({ level, message, timestamp }) => `${timestamp} ${level}: ${message}`)
  ),
  transports: [
    new winston.transports.Console({
      stderrLevels: ['error'],
    }),
    ...(config.env === 'production' && process.env.VERCEL
      ? [
          // Use /tmp for logs in Vercel
          new winston.transports.File({
            filename: path.join(logDir, 'error.log'),
            level: 'error',
            handleExceptions: true,
            handleRejections: true,
          }),
          new winston.transports.File({
            filename: path.join(logDir, 'combined.log'),
            handleExceptions: true,
            handleRejections: true,
          }),
        ]
      : config.env === 'production' && !process.env.VERCEL
      ? [
          new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
          new winston.transports.File({ filename: 'logs/combined.log' }),
        ]
      : []),
  ],
  // Prevent crashes on transport errors
  exceptionHandlers: [
    new winston.transports.Console(),
  ],
  rejectionHandlers: [
    new winston.transports.Console(),
  ],
});

module.exports = logger;