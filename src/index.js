const mongoose = require('mongoose');
const logger = require('./config/logger');
const config = require('./config/config');
const app = require('./app');
const https = require('https');
const fs = require('fs');

let server;

const connectDB = async (retries = 10, delay = 5000) => {
  let attempt = 1;
  while (attempt <= retries) {
    try {
      await mongoose.connect(config.mongoose.url, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
        maxPoolSize: 10,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 45000,
        bufferCommands: false,
        retryWrites: true,
        retryReads: true,
      });
      logger.info(`MongoDB Connected after ${attempt} attempt(s)`);
      return;
    } catch (err) {
      logger.error(`MongoDB Connection Attempt ${attempt} Failed: ${err.message}`);
      if (attempt === retries) {
        logger.error('Max retries reached. Exiting...');
        process.exit(1);
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
      attempt += 1;
    }
  }
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

const unexpectedErrorHandler = (error) => {
  logger.error(`Unexpected error: ${error.message}`);
  exitHandler();
};

process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', unexpectedErrorHandler);

process.on('SIGTERM', () => {
  logger.info('SIGTERM received');
  if (server) {
    server.close();
  }
});