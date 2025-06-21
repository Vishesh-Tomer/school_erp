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

if (config.env === 'production') {
  router.use(basicAuth);
}
router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(specs, { explorer: true }));
router.get('/json', (req, res) => {
  res.json(specs);
});

module.exports = router;