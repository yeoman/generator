var shell = require('shelljs');
var _ = require('lodash');

var user = module.exports;

/**
 * Git related method
 *
 * The value will come from the global scope or the project scope (it'll take
 * what git will use in the current context)
 */

var usernameCache = {};
var emailCache = {};
user.git = {
  // current git user.name
  get username() {
    var username = usernameCache[process.cwd()];

    if (username) {
      return username;
    }

    username = shell.exec('git config --get user.name', { silent: true }).output.trim();
    usernameCache[process.cwd()] = username;

    return username;
  },
  // current git user.email
  get email() {
    var email = emailCache[process.cwd()];

    if (email) {
      return email;
    }

    email = shell.exec('git config --get user.email', { silent: true }).output.trim();
    emailCache[process.cwd()] = email;

    return email;
  }
};
