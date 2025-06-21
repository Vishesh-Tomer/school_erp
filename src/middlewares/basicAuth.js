const httpStatus = require('http-status');
const config = require('../config/config');
const ApiError = require('../utils/ApiError');
const logger = require('../config/logger');

const basicAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  logger.info(`Basic Auth: Received Authorization header: ${authHeader || 'None'}`);

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    logger.warn('Basic Auth: Missing or invalid Authorization header');
    res.set('WWW-Authenticate', 'Basic realm="Swagger UI"'); // Ensure this header is set
    return next(new ApiError(httpStatus.UNAUTHORIZED, 'Missing or invalid Authorization header'));
  }

  const base64Credentials = authHeader.split(' ')[1];
  logger.info(`Basic Auth: Base64 credentials: ${base64Credentials}`);

  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [username, password] = credentials.split(':');

  logger.info(`Basic Auth: Decoded username: ${username}, Expected: ${config.auth.basicAuthUsername}`);
  logger.info(`Basic Auth: Decoded password: [HIDDEN], Expected: [HIDDEN]`);

  if (username !== config.auth.basicAuthUsername || password !== config.auth.basicAuthPassword) {
    logger.warn('Basic Auth: Invalid credentials provided');
    res.set('WWW-Authenticate', 'Basic realm="Swagger UI"'); // Ensure this header is set
    return next(new ApiError(httpStatus.UNAUTHORIZED, 'Invalid credentials'));
  }

  logger.info('Basic Auth: Credentials validated successfully');
  next();
};

module.exports = basicAuth;