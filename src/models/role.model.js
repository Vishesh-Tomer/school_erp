const mongoose = require('mongoose');
const { toJSON } = require('./plugins');

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

async function init() {
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
  }
}

init();

module.exports = RoleModel;