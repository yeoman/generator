var _ = require('lodash');

/**
 * The Generator store
 * This is used to store generator (NPM modules) reference and instantiate them when
 * requested.
 * @constructor
 */

var Store = module.exports = function Store () {
  this._generators = {};
  this._meta = {};
};

/**
 * Store a module under the namespace key
 * @param {String}          namespace - The key under which the generator can be retrieved
 * @param {String|Function} generator - A generator module or a module path
 */

Store.prototype.add = function add (namespace, generator) {
  if (_.isString(generator)) {
    this._storeAsPath(namespace, generator);
    return;
  }
  this._storeAsModule(namespace, generator);
};

Store.prototype._storeAsPath = function _storeAsPath (namespace, path) {
  var meta = {
    resolved: path,
    namespace: namespace
  };
  this._meta[namespace] = meta;
  Object.defineProperty(this._generators, namespace, {
    get: function () {
      var Generator = require(path);
      return _.extend(Generator, meta);
    },
    enumerable: true,
    configurable: true
  });
};

Store.prototype._storeAsModule = function _storeAsModule (namespace, Generator) {
  var meta = {
    resolved: "unknown",
    namespace: namespace
  };
  this._meta[namespace] = meta;
  this._generators[namespace] = _.extend(Generator, meta);
};

/**
 * Get the module registered under the given namespace
 * @param  {String} namespace
 * @return {Module}
 */

Store.prototype.get = function get (namespace) {
  return this._generators[namespace];
};

/**
 * Returns the list of registered namespace.
 * @return {Array} Namespaces array
 */

Store.prototype.namespaces = function namespaces () {
  return Object.keys(this._generators);
};

/**
 * Get the stored generators meta data
 * @return {Object} Generators metadata
 */

Store.prototype.getGeneratorsMeta = function getGeneratorsMeta() {
  return this._meta;
};
