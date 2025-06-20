const { AuditLogModel } = require('../models');

const logAction = async (action, performedBy, target, details, ipAddress, schoolId) => {
  try {
    await AuditLogModel.create({
      action,
      performedBy,
      target,
      details,
      ipAddress,
      schoolId,
    });
  } catch (error) {
    console.error(`Failed to log audit action: ${error.message}`);
  }
};

module.exports = {
  logAction,
};