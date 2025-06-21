const mongoose = require('mongoose');
const logger = require('./config/logger');
const config = require('./config/config');
const app = require('./app');

let server;

const connectDB = async (retries = 5, delay = 3000) => {
  mongoose.set('bufferCommands', false); // Disable buffering globally
  let attempt = 1;
  while (attempt <= retries) {
    try {
      await mongoose.connect(config.mongoose.url, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 5000,
        maxPoolSize: 5,
        connectTimeoutMS: 10000,
        socketTimeoutMS: 20000,
        retryWrites: true,
        retryReads: true,
        autoIndex: config.env !== 'production', // Disable autoIndex in production
      });
      logger.info(`MongoDB connected after ${attempt} attempt(s)`);
      return true;
    } catch (err) {
      logger.error(`MongoDB Connection Attempt ${attempt} Failed: ${err.message}`);
      if (attempt === retries) {
        logger.error('Max retries reached. Exiting...');
        throw err;
      }
      await new Promise(resolve => setTimeout(resolve, delay));
      attempt++;
    }
  }
};

const startServer = async () => {
  try {
    await connectDB();
    server = app.listen(config.port, () => {
      logger.info(`Listening on port ${config.port}`);
    });
  } catch (err) {
    logger.error(`Failed to start server: ${err.message}`);
    process.exit(1);
  }
};

// Health check endpoint
app.get('/health', (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.status(200).json({ status: 'OK', db: dbStatus, uptime: process.uptime() });
});

startServer();

const exitHandler = async () => {
  if (server) {
    server.close(async () => {
      logger.info('Server closed');
      await mongoose.connection.close();
      logger.info('MongoDB connection closed');
      process.exit(1);
    });
  } else {
    await mongoose.connection.close();
    process.exit(1);
  }
};

const unexpectedErrorHandler = async (error) => {
  logger.error(`Unexpected error: ${error.message}`);
  await exitHandler();
};

process.on('uncaughtException', unexpectedErrorHandler);
process.on('unhandledRejection', unexpectedErrorHandler);

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received');
  await exitHandler();
});