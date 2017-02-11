'use strict';
const _ = require('lodash');
const chalk = require('chalk');

const deprecate = function (message, fn) {
  return function () {
    deprecate.log(message);
    return fn.apply(this, arguments);
  };
};

deprecate.log = function (message) {
  console.log(chalk.yellow('(!) ') + message);
};

deprecate.object = function (message, object) {
  const msgTpl = _.template(message);
  const mirror = [];

  Object.keys(object).forEach(name => {
    const func = object[name];

    if (!_.isFunction(func)) {
      mirror[name] = func;
      return;
    }

    mirror[name] = deprecate(msgTpl({name}), func);
  });

  return mirror;
};

deprecate.property = function (message, object, property) {
  const original = object[property];
  Object.defineProperty(object, property, {
    get() {
      deprecate.log(message);
      return original;
    }
  });
};

module.exports = deprecate;
