const mongoose = require('mongoose');
const logger = require('./config/logger');
const config = require('./config/config');
const app = require('./app');
const https = require('https');
const fs = require('fs');
const retry = require('async-retry');

let server;

const connectDB = async (retries = 5, delay = 5000) => {
  return retry(
    async () => {
      await mongoose.connect(config.mongoose.url, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
        maxPoolSize: 5,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 20000,
        retryWrites: true,
        retryReads: true,
      });
      logger.info('MongoDB Connected');
    },
    {
      retries,
      factor: 2,
      minTimeout: delay,
      maxTimeout: 30000,
      onRetry: (err, attempt) => {
        logger.warn(`MongoDB Connection Attempt ${attempt} Failed: ${err.message}`);
      },
    }
  ).catch((err) => {
    logger.error(`MongoDB Connection Failed after ${retries} retries: ${err.message}`);
    process.exit(1);
  });
};

const startServer = async () => {
  try {
    await connectDB();
    if (process.env.NODE_ENV === 'production' && process.env.VERCEL) {
      server = app.listen(config.port, () => {
        logger.info(`Listening to port ${config.port}`);
      });
    } else {
      // Use HTTPS locally for testing
      const options = {
        key: fs.readFileSync('key.pem'),
        cert: fs.readFileSync('cert.pem'),
      };
      server = https.createServer(options, app).listen(config.port, () => {
        logger.info(`Listening on HTTPS port ${config.port}`);
      });
    }
  } catch (err) {
    logger.error(`Failed to start server: ${err.message}`);
    process.exit(1);
  }
};

startServer();

const exitHandler = () => {
  if (server) {
    server.close(() => {
      logger.info('Server closed');
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
};


// src/index.js
const unexpectedErrorHandler = (error) => {
  logger.error(`Unexpected error: ${error.message}`);
  logger.error(error.stack);
  if (server) {
    server.close(() => {
      logger.info('Server closed due to unhandled error');
    });
  }
};

process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', (reason, promise) => {
  logger.error(`Unhandled Rejection at: ${promise}, reason: ${reason.message || reason}`);
  logger.error(reason.stack);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM received');
  if (server) {
    server.close();
  }
});


mongoose.connection.on('connected', () => logger.info('MongoDB: Connected'));
mongoose.connection.on('disconnected', () => logger.warn('MongoDB: Disconnected'));
mongoose.connection.on('error', (err) => logger.error(`MongoDB: Error - ${err.message}`));