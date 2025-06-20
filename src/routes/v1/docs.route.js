const express = require('express');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const swaggerDefinition = require('../../docs/swaggerDef');
// const basicAuth = require('../../middlewares/basicAuth'); // Comment out for testing

const router = express.Router();

const specs = swaggerJsdoc({
  swaggerDefinition,
  apis: ['src/docs/*.yml', 'src/routes/v1/*.js'],
});

// router.use(basicAuth); // Comment out for testing
router.use('/', swaggerUi.serve);
router.get('/', swaggerUi.setup(specs, { explorer: true }));
router.get('/json', (req, res) => {
  res.json(specs);
});

module.exports = router;