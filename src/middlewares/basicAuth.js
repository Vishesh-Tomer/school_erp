const httpStatus = require('http-status');
const ApiError = require('../utils/ApiError');

const basicAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Missing or invalid Authorization header');
  }

  const base64Credentials = authHeader.split(' ')[1];
  const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
  const [username, password] = credentials.split(':');

  const validUsername = process.env.BASIC_AUTH_USERNAME || 'admin';
  const validPassword = process.env.BASIC_AUTH_PASSWORD || 'password';

  console.log('Valid Username:', process.env.BASIC_AUTH_USERNAME);
console.log('Valid Password:', process.env.BASIC_AUTH_PASSWORD);

  if (username !== validUsername || password !== validPassword) {
    throw new ApiError(httpStatus.UNAUTHORIZED, 'Invalid credentials');
  }

  next();
};

module.exports = basicAuth;