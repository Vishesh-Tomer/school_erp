const Joi = require('joi');
const { objectId, password } = require('./custom.validation');

const register = {
  body: Joi.object().keys({
    email: Joi.string().required().email(),
    password: Joi.string().required().custom(password),
    name: Joi.string().required(),
    role: Joi.string().valid('admin', 'superadmin').required(),
    schoolId: Joi.string().custom(objectId).required(),
  }),
};

const login = {
  body: Joi.object().keys({
    email: Joi.string().required().email(),
    password: Joi.string().required(),
    twoFactorCode: Joi.string().optional(),
  }),
};

const logout = {
  body: Joi.object().keys({
    refreshToken: Joi.string().required(),
  }),
};

const refreshTokens = {
  body: Joi.object().keys({
    refreshToken: Joi.string().required(),
  }),
};

const forgotPassword = {
  body: Joi.object().keys({
    email: Joi.string().email().required(),
  }),
};

const resetPassword = {
  query: Joi.object().keys({
    token: Joi.string().required(),
  }),
  body: Joi.object().keys({
    password: Joi.string().required().min(8),
  }),
};

const changePassword = {
  body: Joi.object().keys({
    oldPassword: Joi.string().required(),
    newPassword: Joi.string().required().min(8),
  }),
};

const verify2FA = {
  body: Joi.object().keys({
    code: Joi.string().required().length(6),
  }),
};

const createAdmin = {
  body: Joi.object().keys({
    email: Joi.string().required().email(),
    password: Joi.string().required().min(8),
    name: Joi.string().required(),
    schoolId: Joi.string().custom(objectId).required(),
  }),
};

const getAdmins = {
  query: Joi.object().keys({
    sortBy: Joi.string(),
    limit: Joi.number().integer(),
    page: Joi.number().integer(),
    searchBy: Joi.string(),
    status: Joi.number().integer(),
  }),
};

const getAdmin = {
  params: Joi.object().keys({
    adminId: Joi.string().custom(objectId),
  }),
};

const updateAdmin = {
  params: Joi.object().keys({
    adminId: Joi.string().custom(objectId),
  }),
  body: Joi.object()
    .keys({
      email: Joi.string().email(),
      name: Joi.string(),
      phone: Joi.string(),
      address: Joi.string(),
      state: Joi.string(),
      country: Joi.string(),
      city: Joi.string(),
      zipcode: Joi.string(),
      profilePhoto: Joi.string(),
    })
    .min(1),
};

const deleteAdmin = {
  params: Joi.object().keys({
    adminId: Joi.string().custom(objectId),
  }),
};

module.exports = {
  register,
  login,
  logout,
  refreshTokens,
  forgotPassword,
  resetPassword,
  changePassword,
  verify2FA,
  createAdmin,
  getAdmins,
  getAdmin,
  updateAdmin,
  deleteAdmin,
};