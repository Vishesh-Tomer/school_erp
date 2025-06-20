const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const { adminAuthService, tokenService, cloudinaryService, emailService, auditLogService } = require('../services');
const CONSTANT = require('../config/constant');
const pick = require('../utils/pick');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');

const responseFormat = (success, data, message, code) => ({
  success,
  data,
  message,
  code,
});

const register = catchAsync(async (req, res) => {
  const admin = await adminAuthService.createAdminUser(req.body);
  if (admin.success) {
    const tokens = await tokenService.generateAuthTokens(admin.data);
    await auditLogService.logAction('register', req.user?._id || admin.data._id, 'Admin', {
      email: admin.data.email,
    }, req.ip, admin.data.schoolId);
    res.status(httpStatus.CREATED).send(responseFormat(true, { admin: admin.data, tokens }, CONSTANT.REGISTER_MSG, CONSTANT.SUCCESSFUL));
  } else {
    res.status(admin.code).send(responseFormat(false, {}, admin.message, admin.code));
  }
});

const login = catchAsync(async (req, res) => {
  const { email, password, twoFactorCode } = req.body;
  const admin = await adminAuthService.loginUserWithEmailAndPassword(email.toLowerCase(), password, twoFactorCode);
  if (admin.success) {
    const tokens = await tokenService.generateAuthTokens(admin.data);
    await auditLogService.logAction('login', admin.data._id, 'Admin', { email }, req.ip, admin.data.schoolId);
    res.send(responseFormat(true, { admin: admin.data, tokens }, CONSTANT.LOGIN_MSG, CONSTANT.SUCCESSFUL));
  } else {
    res.status(admin.code).send(responseFormat(false, {}, admin.message, admin.code));
  }
});

const logout = catchAsync(async (req, res) => {
  const result = await adminAuthService.logout(req.body.refreshToken);
  await auditLogService.logAction('logout', req.user._id, 'Admin', {}, req.ip, req.user.schoolId);
  res.send(responseFormat(result.success, {}, result.message, result.code));
});

const refreshTokens = catchAsync(async (req, res) => {
  const tokens = await adminAuthService.refreshAuth(req.body.refreshToken);
  res.send(responseFormat(tokens.success, tokens.data, tokens.message, tokens.code));
});

const forgotPassword = catchAsync(async (req, res) => {
  const admin = await adminAuthService.validateAdminWithEmail(req.body.email);
  if (admin) {
    const resetPasswordToken = await tokenService.generateResetPasswordToken(admin);
    await emailService.sendResetPasswordEmail(req.body.email, resetPasswordToken);
    await auditLogService.logAction('forgotPassword', null, 'Admin', { email: req.body.email }, req.ip, admin.schoolId);
    res.send(responseFormat(true, { resetPasswordToken }, CONSTANT.FORGOT_PASSWORD, CONSTANT.SUCCESSFUL));
  } else {
    res.status(CONSTANT.NOT_FOUND).send(responseFormat(false, {}, CONSTANT.ADMIN_NOT_FOUND, CONSTANT.NOT_FOUND));
  }
});

const resetPassword = catchAsync(async (req, res) => {
  const response = await adminAuthService.resetPassword(req.query.token, req.body.password);
  await auditLogService.logAction('resetPassword', null, 'Admin', {}, req.ip, null);
  res.send(response);
});

const changePassword = catchAsync(async (req, res) => {
  const adminDetails = await adminAuthService.getAdminById(req.user._id);
  if (!adminDetails || !(await adminDetails.isPasswordMatch(req.body.oldPassword))) {
    res.status(CONSTANT.UNAUTHORIZED).send(responseFormat(false, {}, CONSTANT.OLD_PASSWORD_MSG, CONSTANT.UNAUTHORIZED));
  } else {
    const result = await adminAuthService.updateAdminById(req.user._id, { password: req.body.newPassword });
    await auditLogService.logAction('changePassword', req.user._id, 'Admin', {}, req.ip, req.user.schoolId);
    res.send(responseFormat(true, result.data, CONSTANT.CHANGE_PASSWORD, CONSTANT.SUCCESSFUL));
  }
});

const updateProfile = catchAsync(async (req, res) => {
  let profilePhoto;
  if (req.files && req.files.profilePhoto && req.files.profilePhoto[0]) {
    profilePhoto = await cloudinaryService.uploadImage(req.files.profilePhoto[0], 'profile');
    if (profilePhoto) {
      req.body.profilePhoto = profilePhoto.previewUrl; // Use secure_url from Cloudinary
    }
  }
  const result = await adminAuthService.updateAdminById(req.user._id, req.body);
  await auditLogService.logAction('updateProfile', req.user._id, 'Admin', { updates: req.body }, req.ip, req.user.schoolId);
  res.send(responseFormat(true, result.data, result.message, result.code));
});

const getLoggedInUserDetails = catchAsync(async (req, res) => {
  const data = await adminAuthService.getAdminById(req.user._id);
  if (!data) {
    res.status(CONSTANT.NOT_FOUND).send(responseFormat(false, {}, CONSTANT.ADMIN_NOT_FOUND, CONSTANT.NOT_FOUND));
  } else {
    res.send(responseFormat(true, data, CONSTANT.ADMIN_DETAILS, CONSTANT.SUCCESSFUL));
  }
});

const createAdmin = catchAsync(async (req, res) => {
  if (req.user.role !== 'superadmin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Only Super Admins can create Admins');
  }
  const admin = await adminAuthService.createAdminUser({ ...req.body, role: 'admin' });
  if (admin.success) {
    await emailService.sendNewAdminEmail(req.body.email, req.body.password, req.body.name);
    await auditLogService.logAction('createAdmin', req.user._id, 'Admin', { email: req.body.email }, req.ip, req.user.schoolId);
  }
  res.send(responseFormat(admin.success, admin.data, admin.message, admin.code));
});

const getAdmins = catchAsync(async (req, res) => {
  if (req.user.role !== 'superadmin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Only Super Admins can view Admins');
  }
  const options = pick(req.query, ['sortBy', 'limit', 'page', 'searchBy', 'status']);
  const result = await adminAuthService.queryAdmins(options, req.user.schoolId);
  res.send(responseFormat(true, result, CONSTANT.ADMIN_DETAILS, CONSTANT.SUCCESSFUL));
});

const getAdmin = catchAsync(async (req, res) => {
  const admin = await adminAuthService.getAdminById(req.params.adminId);
  if (!admin) {
    res.status(CONSTANT.NOT_FOUND).send(responseFormat(false, {}, CONSTANT.ADMIN_NOT_FOUND, CONSTANT.NOT_FOUND));
  } else {
    res.send(responseFormat(true, admin, CONSTANT.ADMIN_DETAILS, CONSTANT.SUCCESSFUL));
  }
});

const updateAdmin = catchAsync(async (req, res) => {
  if (req.user.role !== 'superadmin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Only Super Admins can update Admins');
  }
  const admin = await adminAuthService.updateAdminById(req.params.adminId, req.body);
  await auditLogService.logAction('updateAdmin', req.user._id, 'Admin', { adminId: req.params.adminId, updates: req.body }, req.ip, req.user.schoolId);
  res.send(responseFormat(admin.success, admin.data, admin.message, admin.code));
});

const deleteAdmin = catchAsync(async (req, res) => {
  if (req.user.role !== 'superadmin') {
    throw new ApiError(httpStatus.FORBIDDEN, 'Only Super Admins can delete Admins');
  }
  const result = await adminAuthService.deleteAdminById(req.params.adminId);
  await auditLogService.logAction('deleteAdmin', req.user._id, 'Admin', { adminId: req.params.adminId }, req.ip, req.user.schoolId);
  res.send(responseFormat(result.success, result.data, result.message, result.code));
});

const setup2FA = catchAsync(async (req, res) => {
  const secret = speakeasy.generateSecret({ name: `SchoolERP:${req.user.email}` });
  const backupCodes = Array.from({ length: 5 }, () => speakeasy.generateSecret().base32.slice(0, 10));
  await adminAuthService.updateAdminById(req.user._id, {
    twoFactorSecret: secret.base32,
    twoFactorEnabled: false,
    twoFactorBackupCodes: {
      type: [String],
      private: true,
    },
  });
  const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);
  res.send(responseFormat(true, { qrCodeUrl, secret: secret.base32, backupCodes }, '2FA setup initiated', CONSTANT.SUCCESSFUL));
});

const verify2FA = catchAsync(async (req, res) => {
  const { code } = req.body;
  const admin = await adminAuthService.getAdminById(req.user._id);
  const isValid = speakeasy.totp.verify({
    secret: admin.twoFactorSecret,
    encoding: 'base32',
    token: code,
  });
  if (isValid) {
    await adminAuthService.updateAdminById(req.user._id, { twoFactorEnabled: true });
    res.send(responseFormat(true, {}, '2FA enabled', CONSTANT.SUCCESSFUL));
  } else {
    res.status(CONSTANT.BAD_REQUEST).send(responseFormat(false, {}, 'Invalid 2FA code', CONSTANT.BAD_REQUEST));
  }
});

module.exports = {
  register,
  login,
  logout,
  refreshTokens,
  forgotPassword,
  resetPassword,
  changePassword,
  updateProfile,
  getLoggedInUserDetails,
  createAdmin,
  getAdmins,
  getAdmin,
  updateAdmin,
  deleteAdmin,
  setup2FA,
  verify2FA,
};