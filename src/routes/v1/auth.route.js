// Note: CSRF protection is optional for API-only backends using JWT. Ensure frontend handles tokens correctly.

const express = require('express');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });
const validate = require('../../middlewares/validate');
const adminAuth = require('../../middlewares/adminAuth');
const authValidation = require('../../validations/auth.validation');
const { adminAuthController } = require('../../controllers');
const csrf = require('csurf');
const { loginLimiter } = require('../../middlewares/rateLimiter');

const router = express.Router();
const csrfProtection = csrf({ cookie: true });

router.post('/register', validate(authValidation.register), adminAuthController.register);
router.post('/login', loginLimiter, validate(authValidation.login), adminAuthController.login);
router.post('/logout', validate(authValidation.logout), csrfProtection, adminAuthController.logout);
router.post('/refresh-tokens', validate(authValidation.refreshTokens), csrfProtection, adminAuthController.refreshTokens);
router.post('/forgot-password', validate(authValidation.forgotPassword), csrfProtection, adminAuthController.forgotPassword);
router.post('/reset-password', validate(authValidation.resetPassword), csrfProtection, adminAuthController.resetPassword);
router.post('/change-password', adminAuth('changePassword'), validate(authValidation.changePassword), csrfProtection, adminAuthController.changePassword);
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