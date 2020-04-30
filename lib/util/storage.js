'use strict';
const assert = require('assert');
const _ = require('lodash');

/**
 * Storage instances handle a json file where Generator authors can store data.
 *
 * The `Generator` class instantiate the storage named `config` by default.
 *
 * @constructor
 * @param {String} [name]     The name of the new storage (this is a namespace)
 * @param {mem-fs-editor} fs  A mem-fs editor instance
 * @param {String} configPath The filepath used as a storage.
 * @param {Boolean} lodashPath Set true to treat name as a lodash path.
 *
 * @example
 * class extend Generator {
 *   writing: function() {
 *     this.config.set('coffeescript', false);
 *   }
 * }
 */
class Storage {
  constructor(name, fs, configPath, lodashPath = false) {
    if (name !== undefined && typeof name !== 'string') {
      configPath = fs;
      fs = name;
      name = undefined;
    }

    assert(configPath, 'A config filepath is required to create a storage');

    this.path = configPath;
    this.name = name;
    this.fs = fs;
    this.existed = Object.keys(this._store).length > 0;
    this.indent = 2;
    this.lodashPath = lodashPath;
  }

  /**
   * Return the current store as JSON object
   * @return {Object} the store content
   * @private
   */
  get _store() {
    const store = this.fs.readJSON(this.path, {});
    if (!this.name) {
      return store || {};
    }

    return (this.lodashPath ? _.get(store, this.name) : store[this.name]) || {};
  }

  /**
   * Persist a configuration to disk
   * @param {Object} val - current configuration values
   * @private
   */
  _persist(val) {
    let fullStore;
    if (this.name) {
      fullStore = this.fs.readJSON(this.path, {});
      if (this.lodashPath) {
        _.set(fullStore, this.name, val);
      } else {
        fullStore[this.name] = val;
      }
    } else {
      fullStore = val;
    }

    this.fs.writeJSON(this.path, fullStore, null, this.indent);
  }

  /**
   * Save a new object of values
   */
  save() {
    this._persist(this._store);
  }

  /**
   * Get a stored value
   * @param  {String} key  The key under which the value is stored.
   * @return {*}           The stored value. Any JSON valid type could be returned
   */
  get(key) {
    return this._store[key];
  }

  /**
   * Get a stored value from a lodash path
   * @param  {String} path  The path under which the value is stored.
   * @return {*}           The stored value. Any JSON valid type could be returned
   */
  getPath(path) {
    return _.get(this._store, path);
  }

  /**
   * Get all the stored values
   * @return {Object}  key-value object
   */
  getAll() {
    return _.cloneDeep(this._store);
  }

  /**
   * Assign a key to a value and schedule a save.
   * @param {String} key  The key under which the value is stored
   * @param {*} val  Any valid JSON type value (String, Number, Array, Object).
   * @return {*} val  Whatever was passed in as val.
   */
  set(key, val) {
    assert(!_.isFunction(val), "Storage value can't be a function");

    const store = this._store;

    if (_.isObject(key)) {
      val = _.assignIn(store, key);
    } else {
      store[key] = val;
    }

    this._persist(store);
    return val;
  }

  /**
   * Assign a lodash path to a value and schedule a save.
   * @param {String} path  The key under which the value is stored
   * @param {*} val  Any valid JSON type value (String, Number, Array, Object).
   * @return {*} val  Whatever was passed in as val.
   */
  setPath(path, val) {
    assert(!_.isFunction(val), "Storage value can't be a function");

    const store = this._store;
    _.set(store, path, val);
    this._persist(store);
    return val;
  }

  /**
   * Delete a key from the store and schedule a save.
   * @param  {String} key  The key under which the value is stored.
   */
  delete(key) {
    const store = this._store;
    delete store[key];
    this._persist(store);
  }

  /**
   * Setup the store with defaults value and schedule a save.
   * If keys already exist, the initial value is kept.
   * @param  {Object} defaults  Key-value object to store.
   * @return {*} val  Returns the merged options.
   */
  defaults(defaults) {
    assert(_.isObject(defaults), 'Storage `defaults` method only accept objects');
    const val = _.defaults(this.getAll(), defaults);
    this.set(val);
    return val;
  }

  /**
   * Create a child storage.
   * @param  {String} path - relative path of the key to create a new storage.
   * @return {Storage} Returns a new Storage.
   */
  createStorage(path) {
    const childName = this.name ? `${this.name}.${path}` : path;
    return new Storage(childName, this.fs, this.path, true);
  }
}

module.exports = Storage;
