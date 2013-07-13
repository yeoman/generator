// User related helper methods

var shell = require('./shell').shell;
var _ = require('lodash');


// Exports module
var user = module.exports = {};


// Git related method
//
// The value will come from the global scope or the project scope (it'll take what git
// will use in the current context)

user.git = {};

// Get the current git user.name
// Returns String
user.git.getUsername = function (cb) {
  return shell.exec('git config --get user.name', { silent: true }).output.trim();
};

// Get the current git user.email
// Returns String
user.git.getEmail = function (cb) {
  return shell.exec('git config --get user.email', { silent: true }).output.trim();
};
