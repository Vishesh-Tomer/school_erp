const mongoose = require('mongoose');
const { toJSON } = require('./plugins');
const logger = require('../config/logger'); // Add import

const roleSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    permissions: {
      type: [String],
      required: true,
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

roleSchema.plugin(toJSON);

const RoleModel = mongoose.model('Role', roleSchema);

async function initRoles() {
  try {
    await mongoose.connection.once('open', async () => {
      const count = await RoleModel.countDocuments();
      if (count === 0) {
        await RoleModel.create([
          {
            name: 'superadmin',
            permissions: ['manageAdmins', 'getAdmins', 'updateProfile', 'changePassword', 'manageRoles'],
          },
          {
            name: 'admin',
            permissions: ['updateProfile', 'changePassword'],
          },
        ]);
        logger.info('Roles initialized');
      }
    });
  } catch (error) {
    logger.error(`Failed to initialize roles: ${error.message}`);
  }
}

if (mongoose.connection.readyState !== 1) {
  mongoose.connection.on('connected', initRoles);
} else {
  initRoles();
}

module.exports = RoleModel;