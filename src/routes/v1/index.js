const express = require('express');
const authRoute = require('./auth.route');
const docsRoute = require('./docs.route');
const healthRoute = require('./health.route');

const router = express.Router();

const defaultRoutes = [
  { path: '/admin', route: authRoute },
  { path: '/docs', route: docsRoute },
  { path: '/health', route: healthRoute },
];

defaultRoutes.forEach((route) => {
  router.use(route.path, route.route);
});

module.exports = router;