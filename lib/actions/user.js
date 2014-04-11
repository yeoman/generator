'use strict';
var shell = require('shelljs');

var nameCache = {};
var emailCache = {};

/**
 * @mixin
 * @alias actions/user
 */
var user = module.exports;

/**
 * Git related properties
 *
 * The value will come from the global scope or the project scope (it'll take
 * what git will use in the current context)
 * @prop name  {String|undefined} - Current git name
 * @prop email {String|undefined} - Current git email
 */
user.git = {
  get name() {
    var name = nameCache[process.cwd()];

    if (name) {
      return name;
    }

    if (shell.which('git')) {
      name = shell.exec('git config --get user.name', { silent: true }).output.trim();
      nameCache[process.cwd()] = name;
    }

    return name;
  },

  get email() {
    var email = emailCache[process.cwd()];

    if (email) {
      return email;
    }

    if (shell.which('git')) {
      email = shell.exec('git config --get user.email', { silent: true }).output.trim();
      emailCache[process.cwd()] = email;
    }

    return email;
  }
};
