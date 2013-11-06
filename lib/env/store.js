var _ = require('lodash');

/**
 * The Generator store
 * This is used to store generator (NPM modules) reference and instantiate them when
 * requested.
 * @constructor
 */

var Store = module.exports = function Store () {
  this._byNamespace = {};
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
  Object.defineProperty(this._byNamespace, namespace, {
    get: function () {
      var Generator = require(path);
      Generator.resolved = path;
      Generator.namespace = namespace;
      return Generator;
    },
    enumerable: true,
    configurable: true
  });
};

Store.prototype._storeAsModule = function _storeAsModule (namespace, func) {
  this._byNamespace[namespace] = func;
  func.resolved = "unknown";
  func.namespace = namespace;
};

/**
 * Get the module registered under the given namespace
 * @param  {String} namespace
 * @return {Module}
 */

Store.prototype.get = function get (namespace) {
  return this._byNamespace[namespace];
};

/**
 * Returns the list of registered namespace.
 * @return {Array} Namespaces array
 */

Store.prototype.namespaces = function namespaces () {
  return Object.keys(this._byNamespace);
};
