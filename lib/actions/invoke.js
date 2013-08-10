var path = require('path');

/**
 * Receives a `namespace`, and an Hash of `options` to invoke a given
 * generator. The usual list of arguments can be set with `options.args`
 * (ex. nopt's argv.remain array)
 *
 * @param {String} namespace
 * @param {Object} options
 * @param {Function} cb
 */

module.exports = function invoke(namespace, options, cb) {
  cb = cb || function () {};
  options = options || {};
  options.args = options.args || [];

  var generator = this.env.create(namespace, options);

  if (!generator.sourceRoot()) {
    generator.sourceRoot(path.join(path.dirname(generator.resolved), 'templates'));
  }

  // validate the generator (show help on missing arguments/options)
  // also show help if --help was specifically passed
  var requiredArgs = generator._arguments.some(function (arg) {
    return arg.config && arg.config.required;
  });

  if (!options.args.length && requiredArgs) {
    return console.log(generator.help());
  }

  if (options.help) {
    return console.log(generator.help());
  }

  this.log.emit('up');
  this.log.invoke(namespace);
  this.log.emit('up');

  generator.on('end', this.log.emit.bind(this.log, 'down'));
  generator.on('end', this.log.emit.bind(this.log, 'down'));

  return generator.run(cb);
};
