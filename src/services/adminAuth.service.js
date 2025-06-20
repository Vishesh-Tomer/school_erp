const httpStatus = require('http-status');
const { AdminModel } = require('../models');
const CONSTANT = require('../config/constant');
const Token = require('../models/token.model');
const { tokenTypes } = require('../config/tokens');
const tokenService = require('./token.service');
const speakeasy = require('speakeasy');

const responseFormat = (success, data, message, code) => ({
  success,
  data,
  message,
  code,
});

const getAdminById = async (id) => {
  return AdminModel.findById(id).select('-password -twoFactorSecret').lean();
};

const updateAdminById = async (adminId, updateBody) => {
  const admin = await AdminModel.findById(adminId);
  if (!admin) {
    return responseFormat(false, {}, CONSTANT.ADMIN_NOT_FOUND, CONSTANT.NOT_FOUND);
  }
  if (updateBody.email && (await AdminModel.isEmailTaken(updateBody.email, adminId))) {
    return responseFormat(false, {}, CONSTANT.ADMIN_EMAIL_ALREADY_EXISTS, CONSTANT.BAD_REQUEST);
  }
  Object.assign(admin, updateBody);
  await admin.save();
  return responseFormat(true, admin, CONSTANT.ADMIN_UPDATE, CONSTANT.SUCCESSFUL);
};

const deleteAdminById = async (adminId) => {
  const admin = await getAdminById(adminId);
  if (!admin) {
    return { data: {}, code: CONSTANT.NOT_FOUND, message: CONSTANT.ADMIN_NOT_FOUND };
  }
  if (admin.role === 'superadmin') {
    return { data: {}, code: CONSTANT.FORBIDDEN, message: 'Cannot delete superadmin' };
  }
  admin.isDeleted = true; 
  await admin.save();
  return { data: admin, code: CONSTANT.SUCCESSFUL, message: CONSTANT.ADMIN_STATUS_DELETE };
};

const getAdminByEmail = async (email) => {
  return AdminModel.findOne({ email }).select('+password +twoFactorSecret');
};

const loginUserWithEmailAndPassword = async (email, password, twoFactorCode) => {
  const admin = await AdminModel.findOne({ email })
    .select('+password +twoFactorSecret')
    .lean();
  if (!admin || !(await bcrypt.compare(password, admin.password))) {
    return responseFormat(false, {}, CONSTANT.UNAUTHORIZED_MSG, CONSTANT.UNAUTHORIZED);
  }
  if (admin.twoFactorEnabled && twoFactorCode) {
    const isValid = speakeasy.totp.verify({
      secret: admin.twoFactorSecret,
      encoding: 'base32',
      token: twoFactorCode,
    });
    if (!isValid) {
      return responseFormat(false, {}, 'Invalid 2FA code', CONSTANT.UNAUTHORIZED);
    }
  }
  delete admin.password;
  delete admin.twoFactorSecret;
  return responseFormat(true, admin, CONSTANT.LOGIN_MSG, CONSTANT.SUCCESSFUL);
};

const validateAdminWithEmail = async (email) => {
  return await getAdminByEmail(email);
};

const logout = async (refreshToken) => {
  const refreshTokenDoc = await Token.findOne({ token: refreshToken, type: tokenTypes.REFRESH, blacklisted: false });
  if (!refreshTokenDoc) {
    return responseFormat(false, {}, CONSTANT.NOT_FOUND_MSG, CONSTANT.NOT_FOUND);
  }
  await refreshTokenDoc.remove();
  return responseFormat(true, {}, CONSTANT.LOGOUT_MSG, CONSTANT.SUCCESSFUL);
};

const refreshAuth = async (refreshToken) => {
  try {
    const refreshTokenDoc = await tokenService.verifyToken(refreshToken, tokenTypes.REFRESH);
    const admin = await getAdminById(refreshTokenDoc.user);
    if (!admin) {
      throw new Error();
    }
    await refreshTokenDoc.remove();
    const tokens = await tokenService.generateAuthTokens(admin);
    return responseFormat(true, tokens, 'Tokens refreshed', CONSTANT.SUCCESSFUL);
  } catch (error) {
    return responseFormat(false, {}, CONSTANT.UNAUTHORIZED_MSG, CONSTANT.UNAUTHORIZED);
  }
};

const resetPassword = async (resetPasswordToken, newPassword) => {
  try {
    const resetPasswordTokenDoc = await tokenService.verifyToken(resetPasswordToken, tokenTypes.RESET_PASSWORD);
    const admin = await getAdminById(resetPasswordTokenDoc.user);
    if (!admin) {
      return responseFormat(false, {}, CONSTANT.ADMIN_NOT_FOUND, CONSTANT.NOT_FOUND);
    }
    await updateAdminById(admin._id, { password: newPassword });
    await Token.deleteMany({ user: admin._id, type: tokenTypes.RESET_PASSWORD });
    return responseFormat(true, {}, 'Password updated successfully', CONSTANT.SUCCESSFUL);
  } catch (error) {
    return responseFormat(false, {}, 'Password reset failed', CONSTANT.UNAUTHORIZED);
  }
};

const createAdminUser = async (userBody) => {
  if (await AdminModel.isEmailTaken(userBody.email)) {
    return responseFormat(false, {}, CONSTANT.ADMIN_EMAIL_ALREADY_EXISTS, CONSTANT.BAD_REQUEST);
  }
  const admin = await AdminModel.create(userBody);
  return responseFormat(true, admin, CONSTANT.ADMIN_CREATE, CONSTANT.SUCCESSFUL);
};

const queryAdmins = async (options, schoolId) => {
  const condition = { $and: [{ isDeleted: false, role: 'admin', schoolId }] };
  if (options.searchBy) {
    condition.$and.push({
      $or: [{ name: { $regex: `.*${options.searchBy}.*`, $options: 'i' } }],
    });
  }
  if (options.status) {
    condition.$and.push({ status: options.status });
  }
  options.sort = { createdAt: -1 };
  return await AdminModel.paginate(condition, options);
};

module.exports = {
  getAdminById,
  updateAdminById,
  deleteAdminById,
  getAdminByEmail,
  loginUserWithEmailAndPassword,
  validateAdminWithEmail,
  logout,
  refreshAuth,
  resetPassword,
  createAdminUser,
  queryAdmins,
};