const { RateLimiterRedis } = require('rate-limiter-flexible');
const Redis = require('redis');

const redisClient = Redis.createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redisClient.connect().catch((err) => console.error('Redis connection error:', err));

const authLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'auth',
  points: 20,
  duration: 15 * 60, // 15 minutes
  blockDuration: 15 * 60, // Block for 15 minutes
});

const loginLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: 'login',
  points: 5,
  duration: 5 * 60, // 5 minutes
  blockDuration: 5 * 60, // Block for 5 minutes
});

module.exports = {
  authLimiter: (req, res, next) => {
    authLimiter
      .consume(req.ip)
      .then(() => next())
      .catch(() => res.status(429).send('Too many requests, please try again later.'));
  },
  loginLimiter: (req, res, next) => {
    loginLimiter
      .consume(req.ip)
      .then(() => next())
      .catch(() => res.status(429).send('Too many login attempts, please try again after 5 minutes.'));
  },
};