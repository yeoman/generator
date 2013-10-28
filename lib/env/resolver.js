var path = require('path');
var fs = require('fs');
var _ = require('lodash');
var glob = require('glob');
var debug = require('debug')('generators:environment');

/**
 * Receives namespaces in an array and tries to find matching generators in the
 * load paths.
 *
 * We lookup namespaces in several places, namely `this.lookups`
 * list of relatives directory path. A `generator-` prefix is added if a
 * namespace wasn't `require()`-able directly, matching `generator-*` kind of
 * pattern in npm installed package.
 *
 * You can also lookup using glob-like star pattern, eg. `angular:*` gets
 * expanded to `angular\*\index.js`.
 *
 * The default alias `generator-$1` lookup is added automatically.
 *
 * ### Examples:
 *
 *     // search for all angular generators in the load path
 *     env.lookup('angular:*');
 *
 *     // register any valid set of generator in the load paths
 *     env.lookup('*:*');
 *
 * @param {String|Array} namespaces
 * @param {String} lookupdir
 */

exports.lookup = function lookup(namespaces, lookupdir) {
  namespaces = Array.isArray(namespaces) ? namespaces : namespaces.split(' ');

  debug('Lookup %s', namespaces);
  namespaces.forEach(function (ns) {
    var filepath = path.join.apply(path, this.alias(ns).split(':'));

    this.paths.forEach(function (base) {
      debug('Looking in %s with filepath %s', base, filepath);

      // no glob pattern
      if (!~filepath.indexOf('*')) {
        try {
          debug('Attempt to register with direct filepath %s', filepath);
          this.register(filepath);
        } catch (e) {
          // silent fail unless not a loadpath error
          if (e.message.indexOf(filepath) === -1) {
            console.error('Unable to register %s (Error: %s)', ns, e.message);
          }
        }

        return;
      }

      this.lookups.forEach(function (lookupdir) {
        var depth = lookupdir && /^\.\/?$/.test(lookupdir) ? '*' : '**';

        var prefixes = this._prefixes.filter(function (prefix) {
          return !(/\//).test(prefix);
        });

        var pattern = filepath
          .replace(/^\*+/, '+(' + prefixes.join('|') + ')*')
          .replace(/\*+$/g, path.join(lookupdir, depth, 'index.js'))
          .replace(/^\*\//, '');

        debug('Globing for generator %s with pattern %s (cwd: %s)', ns, pattern, base);
        glob.sync(pattern, { cwd: base }).forEach(function (filename) {
          // now register, warn on failed require
          try {
            debug('found %s, trying to register', filename);
            this.register(path.resolve(base, filename));
          } catch (e) {
            console.error('Unable to register %s (Error: %s)', filename, e.message);
          }
        }, this);
      }, this);
    }, this);
  }, this);

  return this;
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

/**
 * Adds the namespace prefix to this environment, such as `generator-*`,
 * used when resolving namespace, replacing the leading `*` in the
 * namespace by the configured prefix(es).
 *
 * ### Examples:
 *
 *     this.prefix('generator-');
 *
 * @param {String} prefix
 */

exports.prefix = function _prefix(prefix) {
  if (!prefix) {
    throw new Error('Missing prefix');
  }

  this._prefixes.push(prefix);
  this._prefixReg = new RegExp('^(' + this._prefixes.join('|') + ')');

  return this;
};

/**
 * Get or set the namespace suffix to this environment, such as `*\index.js`,
 * used when resolving namespace, replacing the last `*` in the
 * namespace by the configured suffix.
 *
 * ### Examples:
 *
 *     this.suffix('*\index.js');
 *     this.suffix();
 *     // => '*\index.js'
 *
 * @param {String} suffix
 */

exports.suffix = function _suffix(suffix) {
  this._suffix = this._suffix || '';

  if (!suffix) {
    return this._suffix;
  }

  this._suffix = suffix;
  return this;
};

/**
 * Walk up the filesystem looking for a `node_modules` folder, and add it if
 * found to the load path.
 *
 * @param {String} filename
 * @param {String} basedir
 */

exports.plugins = function plugins(filename, basedir) {
  filename = filename || 'node_modules';
  basedir = basedir || process.cwd();

  var filepath = path.join(basedir, filename);

  if (fs.existsSync(filepath)) {
    this.appendPath(filepath);
    return this;
  }

  if (basedir === path.resolve('/')) {
    return this;
  }

  return this.plugins(filename, path.join(basedir, '..'));
};
