var fs = require('fs');
var path = require('path');
var EventEmitter = require('events').EventEmitter;
var _ = require('lodash');
var util = require('util');


/**
 * Storage instances handle a json file where Generator authors can store data.
 * @param  {String} name       The name of the new storage (this is a namespace)
 * @param  {String} configPath The filepath used as a storage. `.yo-rc.json` is used
 *                             by default
 */

var Storage = module.exports = function Storage(name, configPath) {
  EventEmitter.call(this);

  if (!name) {
    throw new Error('A name parameter is required to create a storage');
  }

  this.path = configPath || path.join(process.cwd(), '.yo-rc.json');
  this.name = name;
  this.existed = false;

  this.save = _.debounce(_.bind(this.forceSave, this), 5);

  this.loadConfig();
};
util.inherits(Storage, EventEmitter);

/**
 * Get the previous configs or setup a new one.
 * note: it won't actually create any file before save is called.
 * @return {Object} Key-value object store
 */

Storage.prototype.loadConfig = function () {

  if (fs.existsSync(this.path)) {
    var content = fs.readFileSync(this.path, 'utf8');
    this._fullStore = JSON.parse(content);
    this.existed = true;
  } else {
    this._fullStore = {};
  }

  if (!this._fullStore[this.name]) {
    this._fullStore[this.name] = {};
  }

  this._store = this._fullStore[this.name];
  return this._store;
};

/**
 * Schedule a save to happen sometime on a future tick.
 * Note: This method is actually defined at runtime in the constructor function.
 * @return {null}
 */

Storage.prototype.save = function() {};

/**
 * Force save (synchronously write the store to disk).
 * @return {null}
 */

Storage.prototype.forceSave = function () {
  fs.writeFileSync(this.path, JSON.stringify(this._fullStore, null, '  '));
  this.emit('save');
};

/**
 * Get a stored value
 * @param  {String} key  The key under which the value is stored.
 * @return {*}           The stored value. Any JSON valid type could be returned
 */

Storage.prototype.get = function (key) {
  return this._store[key];
};

/**
 * Get all the stored values
 * @return {Object}  key-value object
 */

Storage.prototype.getAll = function () {
  return _.cloneDeep(this._store);
};

/**
 * Assign a key to a value and schedule a save.
 * @param {String} key
 * @param {*} val  Any valid JSON type value (String, Number, Array, Object)
 */

Storage.prototype.set = function (key, val) {
  if (_.isFunction(val)) {
    throw new Error('Storage value can\'t be a function');
  }

  if (_.isObject(key)) {
    _.extend(this._store, key);
  } else {
    this._store[key] = val;
  }
  this.save();
};

/**
 * Delete a key from the store and schedule a save.
 * @param  {String} key
 * @return {null}
 */

Storage.prototype.delete = function (key) {
  delete this._store[key];
  this.save();
};

/**
 * Setup the store with defaults value and schedule a save.
 * If keys already exist, the initial value is kept.
 * @param  {Object} defaults Key-value object to store.
 * @return {null}
 */

Storage.prototype.defaults = function (defaults) {
  if (!_.isObject(defaults)) {
    throw new Error('Storage `defaults` method only accept objects');
  }
  var val = _.defaults(this.getAll(), defaults);
  this.set(val);
};
