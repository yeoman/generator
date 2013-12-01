var path = require('path');
var _ = require('lodash');
var glob = require('glob');
var shell = require('shelljs');
var debug = require('debug')('generators:environment');

/**
 * Search for generators and their sub generators.
 *
 * A generator is a `:lookup/:name/index.js` file placed inside an NPM module.
 *
 * Defaults lookups are:
 *   - ./
 *   - generators/
 *   - lib/generators/
 *
 * So this index file `node_modules/generator-dummy/lib/generators/yo/index.js` would be
 * registered as `dummy:yo` generator.
 */

exports.lookup = function () {
  var generatorsModules = this._getNpmGenerators();
  var patterns = [];

  this.lookups.forEach(function (lookup) {
    generatorsModules.forEach(function (modulePath) {
      var generatorPath = path.join(modulePath, lookup);
      patterns.push(generatorPath + '/*/index.js');
    });
  });

  patterns.forEach(function (pattern) {
    glob.sync(pattern).forEach(function (filename) {
      this._tryRegistering(filename);
    }, this);
  }, this);
};

/**
 * Search NPM for every available generators.
 * Generators are NPM modules who's name start with `generator-` and who're placed in the
 * top level `node_module` path. They can be installed globally or locally.
 *
 * @return {Array} List of the generators path
 */

exports._getNpmGenerators = function () {
  var local = shell.exec('npm ls --parseable', { silent: true }).output;
  var global = shell.exec('npm ls -g --parseable', { silent: true }).output;

  // `shell.exec` merge stdout and stderr togheter in output. So we manually filter out
  // npm warnings and errors.
  var packages = (local + global).replace(/^(npm.*)$/mg, '').split('\n');

  return packages.filter(function (name) {
    return !/(node_modules).*(node_modules)/.test(name) && /(generator-)/.test(name);
  });
};

/**
 * Try registering a Generator to this environment.
 * @param  {String} generatorReference A generator reference, usually a file path.
 */

exports._tryRegistering = function (generatorReference) {
  try {
    debug('found %s, trying to register', generatorReference);
    this.register(generatorReference);
  } catch (e) {
    console.error('Unable to register %s (Error: %s)', generatorReference, e.message);
  }
};

/**
 * Get or create an alias.
 *
 * Alias allows the `get()` and `lookup()` methods to search in alternate
 * filepath for a given namespaces. It's used for example to map `generator-*`
 * npm package to their namespace equivalent (without the generator- prefix),
 * or to default a single namespace like `angular` to `angular:app` or
 * `angular:all`.
 *
 * Given a single argument, this method acts as a getter. When both name and
 * value are provided, acts as a setter and registers that new alias.
 *
 * If multiple alias are defined, then the replacement is recursive, replacing
 * each alias in reverse order.
 *
 * An alias can be a single String or a Regular Expression. The finding is done
 * based on .match().
 *
 * ### Examples:
 *
 *     env.alias(/^([a-zA-Z0-9:\*]+)$/, 'generator-$1');
 *     env.alias(/^([^:]+)$/, '$1:app');
 *     env.alias(/^([^:]+)$/, '$1:all');
 *     env.alias('foo');
 *     // => generator-foo:all
 *
 * @param {String|RegExp} match
 * @param {String} value
 */

exports.alias = function alias(match, value) {
  if (match && value) {
    this.aliases.push({
      match: match instanceof RegExp ? match : new RegExp('^' + match + '$'),
      value: value
    });
    return this;
  }

  var aliases = this.aliases.slice(0).reverse();

  var matcher = aliases.filter(function (alias) {
    return alias.match.test(match);
  });

  return aliases.reduce(function (res, alias) {
    if (!alias.match.test(res)) {
      return res;
    }

    return res.replace(alias.match, alias.value);
  }, match);
};
