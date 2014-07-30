'use strict';
var path = require('path');

/**
 * Receives a `namespace`, and an Hash of `options` to invoke a given
 * generator. The usual list of arguments can be set with `options.args`
 * (ex. nopt's argv.remain array)
 *
 * DEPRECATION notice: As of version 0.17.0, `invoke()` should usually be
 * replaced by `composeWith()`.
 *
 * @param {String} namespace
 * @param {Object} options
 * @param {Function} cb
 *
 * @mixin
 * @alias actions/invoke
 */

module.exports = function invoke(namespace, options, cb) {
  var yeoman = require('../..');
  cb = cb || function () {};
  options = options || {};
  options.args = options.args || [];

  // Create a new environment, and copy the generator store to prevent
  // the performance cost of redoing a lookup.
  var env = yeoman();
  env.store = this.env.store;

  var generator = env.create(namespace, options);

  this.log.emit('up');
  this.log.invoke(namespace);
  this.log.emit('up');

  generator.on('end', this.log.emit.bind(this.log, 'down'));
  generator.on('end', this.log.emit.bind(this.log, 'down'));

  return generator.run(cb);
};
