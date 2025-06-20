const { version } = require('../../package.json');
const config = require('../config/config');

const swaggerDef = {
  openapi: '3.0.0',
  info: {
    title: 'School ERP API Documentation',
    version,
    license: {
      name: 'MIT',
      url: 'https://github.com/hagopj13/node-express-boilerplate/blob/master/LICENSE',
    },
  },
  servers: [
    {
      url: process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/v1` : `http://localhost:${config.port}/v1`,
    },
  ],
};

module.exports = swaggerDef;