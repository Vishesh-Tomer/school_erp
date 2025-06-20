const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const auditLogSchema = mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
    },
    performedBy: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'Admin',
      required: true,
    },
    target: {
      type: String,
    },
    details: {
      type: Object,
    },
    ipAddress: {
      type: String,
    },
    schoolId: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'School',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

auditLogSchema.plugin(toJSON);
auditLogSchema.plugin(paginate);

const AuditLogModel = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLogModel;