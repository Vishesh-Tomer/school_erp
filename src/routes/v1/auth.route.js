const express = require('express');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const validate = require('../../middlewares/validate');
const adminAuth = require('../../middlewares/adminAuth');
const authValidation = require('../../validations/auth.validation');
const { adminAuthController } = require('../../controllers');
const { loginLimiter } = require('../../middlewares/rateLimiter');

const router = express.Router();

router.post('/register', validate(authValidation.register), adminAuthController.register);
router.post('/login', loginLimiter, validate(authValidation.login), adminAuthController.login);
router.post('/logout', validate(authValidation.logout), adminAuthController.logout);
router.post('/refresh-tokens', validate(authValidation.refreshTokens), adminAuthController.refreshTokens);
router.post('/forgot-password', validate(authValidation.forgotPassword), adminAuthController.forgotPassword);
router.post('/reset-password', validate(authValidation.resetPassword), adminAuthController.resetPassword);
router.post('/change-password', adminAuth('changePassword'), validate(authValidation.changePassword), adminAuthController.changePassword);
router.post('/setup-2fa', adminAuth(), adminAuthController.setup2FA);
router.post('/verify-2fa', adminAuth(), validate(authValidation.verify2FA), adminAuthController.verify2FA);

router
  .route('/profile')
  .patch(adminAuth('updateProfile'), upload.fields([{ name: 'profilePhoto', maxCount: 1 }]), adminAuthController.updateProfile)
  .get(adminAuth(), adminAuthController.getLoggedInUserDetails);

router
  .route('/admins')
  .post(adminAuth('manageAdmins'), validate(authValidation.createAdmin), adminAuthController.createAdmin)
  .get(adminAuth('getAdmins'), validate(authValidation.getAdmins), adminAuthController.getAdmins);

router
  .route('/admins/:adminId')
  .get(adminAuth('getAdmins'), validate(authValidation.getAdmin), adminAuthController.getAdmin)
  .patch(adminAuth('manageAdmins'), validate(authValidation.updateAdmin), adminAuthController.updateAdmin)
  .delete(adminAuth('manageAdmins'), validate(authValidation.deleteAdmin), adminAuthController.deleteAdmin);

module.exports = router;