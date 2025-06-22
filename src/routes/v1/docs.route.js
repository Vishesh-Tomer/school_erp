const express = require('express');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const swaggerDefinition = require('../../docs/swaggerDef');
const basicAuth = require('../../middlewares/basicAuth');
const config = require('../../config/config');
const path = require('path'); // Add this if using path.resolve

const router = express.Router();

const specs = swaggerJsdoc({
  swaggerDefinition,
  apis: ['src/docs/*.yml', 'src/routes/v1/*.js'],
});

// Apply Basic Auth in production
if (config.env === 'production') {
  router.use(basicAuth);
}

// Serve Swagger UI static files explicitly
router.use('/swagger-ui', express.static(path.join(__dirname, '../../../node_modules/swagger-ui-dist')));
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

// Serve Swagger JSON for debugging
router.get('/json', (req, res) => {
  res.json(specs);
});

module.exports = router;