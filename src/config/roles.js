const { RoleModel } = require('../models');

const getRoles = async () => {
  const roles = await RoleModel.find();
  return roles.map((role) => role.name);
};

const getRoleRights = async (roleName) => {
  const role = await RoleModel.findOne({ name: roleName });
  return role ? role.permissions : [];
};

module.exports = {
  getRoles,
  getRoleRights,
};