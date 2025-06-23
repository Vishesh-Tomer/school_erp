const express = require('express');
const helmet = require('helmet');
const { body, validationResult } = require('express-validator');
const compression = require('compression');
const cors = require('cors');
const passport = require('passport');
const httpStatus = require('http-status');
const promMiddleware = require('express-prometheus-middleware');
const config = require('./config/config');
const morgan = require('./config/morgan');
const { jwtStrategy } = require('./config/passport');
const { authLimiter } = require('./middlewares/rateLimiter');
const routes = require('./routes/v1');
const { errorConverter, errorHandler } = require('./middlewares/error');
const ApiError = require('./utils/ApiError');
const logger = require('./config/logger');
const mongoose = require('mongoose');

const app = express();

if (config.env !== 'test') {
  app.use(morgan.successHandler);
  app.use(morgan.errorHandler);
}

app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use([
  body('*').trim().escape(),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(httpStatus.BAD_REQUEST).json({ errors: errors.array() });
    }
    next();
  },
]);

app.use(compression());
app.use(cors());
app.use(cors({ origin: '*' }));

app.use(
  promMiddleware({
    metricsPath: '/metrics',
    collectDefaultMetrics: true,
    requestDurationBuckets: [0.1, 0.5, 1, 1.5],
  })
);

app.use(passport.initialize());
passport.use('jwt', jwtStrategy);

if (config.env === 'production') {
  app.use('/v1/auth', authLimiter);
}

app.use(async (req, res, next) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      logger.warn('MongoDB not connected; relying on initial connection');
    }
    next();
  } catch (error) {
    logger.error(`MongoDB middleware error: ${error.message}`);
    next(new ApiError(httpStatus.SERVICE_UNAVAILABLE, 'Database unavailable, please try again later'));
  }
});

if (config.env === 'test') {
  app.use((req, res, next) => {
    req.csrfToken = () => 'dummy-csrf-token';
    next();
  });
}

app.use('/v1', routes);

app.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, 'Not found'));
});

app.use(errorConverter);
app.use(errorHandler);

module.exports = app;