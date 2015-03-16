'use strict';

var chalk = require('chalk');

var deprecate = function (message, fn) {
  return function () {
    deprecate.log(message);
    return fn.apply(this, arguments);
  };
};

deprecate.log = function (message) {
  console.log(chalk.yellow('(!) ') + message);
};

module.exports = deprecate;
