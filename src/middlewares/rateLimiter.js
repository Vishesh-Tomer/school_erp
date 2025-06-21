const { RateLimiterRedis } = require('rate-limiter-flexible');
const { createClient } = require('redis');
const logger = require('../config/logger');

let redisClient;
let authLimiter;
let loginLimiter;

const initializeRedis = async () => {
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL,
      socket: {
        tls: true, // Use TLS for Upstash
        rejectUnauthorized: false, // Required for some environments
      },
    });

    redisClient.on('error', (err) => logger.error(`Redis error: ${err.message}`));
    redisClient.on('connect', () => logger.info('Connected to Redis'));
    redisClient.on('reconnecting', () => logger.warn('Reconnecting to Redis...'));

    await redisClient.connect();

    authLimiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'auth',
      points: 20, // 20 requests
      duration: 15 * 60, // per 15 minutes
      blockDuration: 15 * 60, // block for 15 minutes if exceeded
    });

    loginLimiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'login',
      points: 5, // 5 login attempts
      duration: 5 * 60, // per 5 minutes
      blockDuration: 5 * 60, // block for 5 minutes if exceeded
    });

    logger.info('Redis rate limiters initialized');
  } catch (error) {
    logger.error(`Failed to initialize Redis: ${error.message}`);
    // Fallback to no-op rate limiter
    authLimiter = null;
    loginLimiter = null;
  }
};

// Initialize Redis on module load
initializeRedis();

module.exports = {
  authLimiter: async (req, res, next) => {
    if (!authLimiter) {
      logger.warn('Rate limiting disabled due to Redis initialization failure');
      return next();
    }
    try {
      await authLimiter.consume(req.ip);
      next();
    } catch (error) {
      logger.error(`Rate limit exceeded for IP ${req.ip}: ${error.message}`);
      res.status(429).send('Too many requests, please try again later.');
    }
  },
  loginLimiter: async (req, res, next) => {
    if (!loginLimiter) {
      logger.warn('Rate limiting disabled due to Redis initialization failure');
      return next();
    }
    try {
      await loginLimiter.consume(req.ip);
      next();
    } catch (error) {
      logger.error(`Login rate limit exceeded for IP ${req.ip}: ${error.message}`);
      res.status(429).send('Too many login attempts, please try again after 5 minutes.');
    }
  },
};