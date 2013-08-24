var fs = require('fs');
var path = require('path');
var EventEmitter = require('events').EventEmitter;
var _ = require('lodash');
var util = require('util');

// Storage module handle configuration saving, and root file creation
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


// Use current config or initialize one
// note: it won't actually create any file before save is called.
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

// Save the configuration to file (create the store file if inexistant)
Storage.prototype.forceSave = function () {
  fs.writeFileSync(this.path, JSON.stringify(this._fullStore, null, '  '));
  this.emit('save');
};

// Return the property value
Storage.prototype.get = function (key) {
  return this._store[key];
};

// Return the complete store key/value (does not return a reference)
Storage.prototype.getAll = function () {
  return _.cloneDeep(this._store);
};

// Set a key to a value
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

// Delete a property from the store
Storage.prototype.delete = function (key) {
  delete this._store[key];
  this.save();
};

// Setup defaults values
Storage.prototype.defaults = function (defaults) {
  if (!_.isObject(defaults)) {
    throw new Error('Storage `defaults` method only accept objects');
  }
  var val = _.defaults(this.getAll(), defaults);
  this.set(val);
};
