const mongoose = require('mongoose');
const app = require('./app');
const config = require('./config/config');
const logger = require('./config/logger');

let server;

const connectDB = async (retries = 5, delay = 10000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await mongoose.connect(config.mongoose.url, config.mongoose.options);
      logger.info('Connected to MongoDB');
      return;
    } catch (error) {
      logger.error(`MongoDB connection attempt ${attempt} failed: ${error.message}`);
      if (attempt === retries) {
        logger.error('Max retries reached. Exiting...');
        process.exit(1);
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
};

const startServer = async () => {
  await connectDB();
  server = app.listen(config.port, () => {
    logger.info(`Server listening on port ${config.port}`);
  });
};

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
  console.error(`Unexpected error: ${error.message}`); // Ensure Vercel captures this
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


startServer();