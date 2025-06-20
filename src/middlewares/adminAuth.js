const httpStatus = require('http-status');
const passport = require('passport');
const ApiError = require('../utils/ApiError');
const CONSTANT = require('../config/constant');
const { getRoleRights } = require('../config/roles');
const { Token } = require('../models');

const adminAuth = (...requiredRights) => async (req, res, next) => {
  passport.authenticate('jwt', { session: false }, async (err, admin, info) => {
    if (err || info || !admin) {
      return res.status(CONSTANT.UNAUTHORIZED).send({ code: CONSTANT.UNAUTHORIZED, message: CONSTANT.NO_TOKEN });
    }

    const token = req.headers.authorization?.split(' ')[1];
    const tokenDoc = await Token.findOne({ token, user: admin._id, type: tokenTypes.ACCESS, blacklisted: false });
    if (!tokenDoc) {
      return res.status(CONSTANT.UNAUTHORIZED).send({ code: CONSTANT.UNAUTHORIZED, message: 'Invalid Token!' });
    }

    req.user = admin;

    if (requiredRights.length) {
      const userRights = await getRoleRights(admin.role);
      const hasRequiredRights = requiredRights.every((right) => userRights.includes(right));
      if (!hasRequiredRights && req.params.adminId !== admin.id) {
        return next(new ApiError(httpStatus.FORBIDDEN, 'Forbidden'));
      }
    }

    next();
  })(req, res, next);
};

module.exports = adminAuth;