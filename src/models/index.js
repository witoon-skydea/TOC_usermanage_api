const User = require('./user.model');
const Role = require('./role.model');
const Service = require('./service.model');
const UserService = require('./userService.model');
const Token = require('./token.model');
const AuditLog = require('./auditLog.model');

module.exports = {
  User,
  Role,
  Service,
  UserService,
  Token,
  AuditLog
};
