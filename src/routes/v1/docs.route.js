const express = require('express');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const swaggerDefinition = require('../../docs/swaggerDef');
const basicAuth = require('../../middlewares/basicAuth');
const config = require('../../config/config');
const path = require('path');
const logger = require('../../config/logger');

const router = express.Router();

const specs = swaggerJsdoc({
  swaggerDefinition,
  apis: [
    path.resolve(__dirname, '../../docs/*.yml'),
    path.resolve(__dirname, './*.js'),
  ],
});

// Log spec generation for debugging
logger.info('Swagger specs generated:', {
  paths: Object.keys(specs.paths || {}),
  operations: Object.values(specs.paths || {}).flatMap(p => Object.keys(p)).length,
});

// Validate spec
if (!specs.paths || Object.keys(specs.paths).length === 0) {
  logger.error('Swagger spec is empty. Check YAML files and route JSDoc comments.');
} else {
  logger.info('Swagger specs generated:', {
    paths: Object.keys(specs.paths),
    operations: Object.values(specs.paths).flatMap(p => Object.keys(p)).length,
  });
}

// Apply Basic Auth in production
if (config.env === 'production') {
  router.use(basicAuth);
}

router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(specs, {
  explorer: true,
  swaggerOptions: {
    persistAuthorization: true,
    preauthorizeApiKey: {
      basicAuth: {
        authType: 'basic',
        username: '',
        password: '',
      },
    },
    security: [{ basicAuth: [] }],
  },
}));

router.get('/json', (req, res) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  logger.info('Serving Swagger JSON spec');
  res.json(specs);
});

module.exports = router;