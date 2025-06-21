const express = require('express');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const swaggerDefinition = require('../../docs/swaggerDef');
const basicAuth = require('../../middlewares/basicAuth');
const config = require('../../config/config');

const router = express.Router();

const specs = swaggerJsdoc({
  swaggerDefinition,
  apis: ['src/docs/*.yml', 'src/routes/v1/*.js'],
});

// Apply Basic Auth in production
if (config.env === 'production') {
  router.use(basicAuth);
}

// Serve Swagger UI with Basic Auth configuration
router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(specs, {
  explorer: true,
  swaggerOptions: {
    persistAuthorization: true, // Retain credentials after page refresh
    preauthorizeApiKey: {
      basicAuth: {
        authType: 'basic',
        username: '', // Leave empty; user will input
        password: '', // Leave empty; user will input
      },
    },
    security: [{ basicAuth: [] }], // Apply Basic Auth to all endpoints
  },
}));

// Serve Swagger JSON for debugging
router.get('/json', (req, res) => {
  res.json(specs);
});

module.exports = router;