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

// Enable gzip compression
app.use(compression());

// Enable CORS
app.use(cors());
app.use(cors({ origin: '*' }));

// Add Prometheus metrics middleware
app.use(promMiddleware({
  metricsPath: '/metrics',
  collectDefaultMetrics: true,
  requestDurationBuckets: [0.1, 0.5, 1, 1.5],
}));

// Initialize Passport and JWT strategy
app.use(passport.initialize());
passport.use('jwt', jwtStrategy);

// Limit repeated failed requests to auth endpoints
if (config.env === 'production') {
  app.use('/v1/auth', authLimiter);
}

// API routes
app.use('/v1', routes);

// Send back a 404 error for any unknown API request
app.use((req, res, next) => {
  next(new ApiError(httpStatus.NOT_FOUND, 'Not found'));
});

// Convert errors to ApiError, if needed
app.use(errorConverter);

// Handle errors
app.use(errorHandler);

module.exports = app;