'use strict';
var fs = require('fs');
var util = require('util');
var path = require('path');
var events = require('events');
var _ = require('lodash');
var async = require('async');
var findup = require('findup-sync');
var chalk = require('chalk');
var file = require('file-utils');

var engines = require('./util/engines');
var Conflicter = require('./util/conflicter');
var Storage = require('./util/storage');

var noop = function () {};
var fileLogger = { write: noop, warn: noop };

// TOOD(mklabs): flesh out api, remove config (merge with options, or just remove the
// grunt config handling)

/**
 * The `Base` object provides the common API shared by all generators,
 * defining options, arguments, hooks, file, prompt, log, API etc.
 *
 * Every generator should extend from this object.
 *
 * @constructor
 * @mixes util/common
 * @mixes actions/actions
 * @mixes actions/fetch
 * @mixes actions/file
 * @mixes actions/install
 * @mixes actions/invoke
 * @mixes actions/prompt
 * @mixes actions/spawn_command
 * @mixes actions/string
 * @mixes actions/user
 * @mixes actions/wiring
 *
 * @param {String|Array} args
 * @param {Object} options
 */

var Base = module.exports = function Base(args, options) {
  var self = this;
  events.EventEmitter.call(this);

  if (!Array.isArray(args)) {
    options = args;
    args = [];
  }

  this.args = this.arguments = args || [];
  this.options = options || {};

  // checks required paramaters
  if (!this.options.env) {
    throw new Error('You must provide the environment object. Use env#create() to create a new generator.');
  }

  if (!this.options.resolved) {
    throw new Error('You must provide the resolved path value. Use env#create() to create a new generator.');
  }

  this.env = this.options.env;
  this.resolved = this.options.resolved;
  this.fallbacks = this.options.generators || this.options.generator || {};
  this.generatorName = this.options.name || '';

  require('./env').enforceUpdate(this.env);

  this.description = '';

  this.async = function () {
    return function () {};
  };

  _.defaults(this.options, this.fallbacks, {
    engine: engines.underscore
  });

  this._engine = this.options.engine;

  // cleanup options hash from default engine, if users didn't provided one.
  if (!options.engine) {
    delete this.options.engine;
  }

  this.conflicter = new Conflicter(this.env.adapter);
  this.conflicter.force = this.options.force;

  // Since log is both a function and an object we need to use Object.defineProperty
  // instead of this.env.adapter.log.apply o similar approaches
  this.log = this.env.adapter.log;

  // determine the app root
  var rootPath = findup('.yo-rc.json');
  if (rootPath) {
    process.chdir(path.dirname(rootPath));
  }

  this._arguments = [];
  this._options = [];
  this._hooks = [];
  this._conflicts = [];
  this.appname = path.basename(process.cwd()).replace(/[^\w\s]+?/g, ' ');

  this.option('help', {
    alias: 'h',
    desc: 'Print generator\'s options and usage'
  });

  // Set the file-utils environments
  // Set logger as a noop as logging is handled by the yeoman conflicter
  this.src = file.createEnv({
    base: this.sourceRoot(),
    dest: this.destinationRoot(),
    logger: fileLogger
  });
  this.dest = file.createEnv({
    base: this.destinationRoot(),
    dest: this.sourceRoot(),
    logger: fileLogger
  });

  this.dest.registerValidationFilter('collision', this.getCollisionFilter());
  this.src.registerValidationFilter('collision', this.getCollisionFilter());

  this._setStorage();

  // ensure source/destination path, can be configured from subclasses
  this.sourceRoot(path.join(path.dirname(this.resolved), 'templates'));
};

util.inherits(Base, events.EventEmitter);

// Mixin the actions modules
_.extend(Base.prototype, require('./actions/actions'));
_.extend(Base.prototype, require('./actions/fetch'));
_.extend(Base.prototype, require('./actions/file'));
_.extend(Base.prototype, require('./actions/install'));
_.extend(Base.prototype, require('./actions/string'));
_.extend(Base.prototype, require('./actions/wiring'));
_.extend(Base.prototype, require('./util/common'));
Base.prototype.user = require('./actions/user');
Base.prototype.shell = require('shelljs');

Base.prototype.prompt = function (questions, callback) {
  this.env.adapter.prompt(questions, callback);
  return this;
};

Base.prototype.invoke = require('./actions/invoke');
Base.prototype.spawnCommand = require('./actions/spawn_command');

/**
 * Adds an option to the set of generator expected options, only used to
 * generate generator usage. By default, generators get all the cli option
 * parsed by nopt as a `this.options` Hash object.
 *
 * ### Options:
 *
 *   - `desc` Description for the option
 *   - `type` Either Boolean, String or Number
 *   - `default` Default value
 *   - `banner` String to show on usage notes
 *   - `hide` Boolean whether to hide from help
 *
 * @param {String} name
 * @param {Object} config
 */

Base.prototype.option = function option(name, config) {
  config = config || {};
  _.defaults(config, {
    name: name,
    desc: 'Description for ' + name,
    type: Boolean,
    defaults: false,
    hide: false
  });

  var opt = this._options.filter(function (el) {
    return el.name === name;
  })[0];

  if (!opt) {
    this._options.push(config);
  } else {
    opt = config;
  }

  if (!this.options[name]) {
    this.options[name] = config.defaults;
  }

  return this;
};

/**
 * Adds an argument to the class and creates an attribute getter for it.
 *
 * Arguments are different from options in several aspects. The first one
 * is how they are parsed from the command line, arguments are retrieved
 * from position.
 *
 * Besides, arguments are used inside your code as a property (`this.argument`),
 * while options are all kept in a hash (`this.options`).
 *
 * ### Options:
 *
 *   - `desc` Description for the argument
 *   - `required` Boolean whether it is required
 *   - `optional` Boolean whether it is optional
 *   - `type` String, Number, Array, or Object
 *   - `defaults` Default value for this argument
 *   - `banner` String to show on usage notes
 *
 * @param {String} name
 * @param {Object} config
 */

Base.prototype.argument = function argument(name, config) {
  config = config || {};
  _.defaults(config, {
    name: name,
    required: config.defaults == null ? true : false,
    type: String
  });

  config.banner = config.banner || this.bannerFor(config);

  this._arguments.push({
    name: name,
    config: config
  });

  var position = -1;
  this._arguments.forEach(function (arg, i) {
    if (position !== -1) {
      return;
    }

    if (arg.name === name) {
      position = i;
    }
  });

  // a bit of coercion and type handling, to be improved
  // just dealing with Array/String, default is assumed to be String
  var value = config.type === Array ? this.args.slice(position) : this.args[position];
  value = position >= this.args.length ? config.defaults : value;

  // If the help option was provided, we don't want to check for required arguments,
  // since we're only going to print the help message anyway.
  // If the help option was not provided, check whether the argument was required,
  // and whether a value was provided.
  if (!this.options.help && config.required && value === undefined) {
    return this.emit('error', new Error('Did not provide required argument ' + chalk.bold(name) + '!'));
  }

  this[name] = value;
  return this;
};

/**
 * Runs the generator, executing top-level methods in the order they
 * were defined.
 *
 * Special named method like `constructor` and `initialize` are skipped
 * (CoffeeScript and Backbone like inheritence), or any method prefixed by
 * a `_`.
 *
 * You can also supply the arguments for the method to be invoked, if
 * none is given, the same values used to initialize the invoker are
 * used to initialize the invoked.
 *
 * @param {String|Array} args
 * @param {Function} cb
 */

Base.prototype.run = function run(args, cb) {
  var self = this;
  this._running = true;
  this.emit('start');
  this.emit('run');

  if (!cb) {
    cb = args;
    args = this.args;
  }

  cb = cb || function () {};

  var runHooks = function () {
    self.runHooks(cb);
  };

  var methods = Object.keys(Object.getPrototypeOf(this));

  var resolve = function (method) {
    var rules = {
      underscore: method.charAt(0) !== '_',
      initialize: !/^(constructor|initialize)$/.test(method),
      valid: function () {
        return this.underscore && this.initialize;
      }
    };

    return function (next) {
      if (!rules.valid()) {
        return next();
      }

      var done = function (err) {
        if (err) {
          self.emit('error', err);
        }

        // resolve file conflicts after every method completes.
        self.conflicter.resolve(function (err) {
          if (err) {
            return self.emit('error', err);
          }

          next();
        });
      };

      var running = false;
      self.async = function () {
        running = true;
        return done;
      };

      self.emit(method);
      self.emit('method', method);

      // Make sure we run the method assigned to the prototype, not an instance value.
      Object.getPrototypeOf(self)[method].apply(self, args);

      if (!running) {
        done();
      }
    };
  };

  async.series(methods.map(resolve), runHooks);

  return this;
};

/**
 * Goes through all registered hooks, invoking them in series.
 *
 * @param {Function} cb
 */

Base.prototype.runHooks = function runHooks(cb) {
  var self = this;
  var hooks = this._hooks;

  var callback = function (err) {
    self.emit('end');
    cb(err);
  };

  var resolve = function (hook) {
    var resolved = self.defaultFor(hook.name);
    var context = hook.as || self.resolved || self.generateName;
    var options = _.clone(hook.options || self.options);
    options.args = _.clone(hook.args || self.args);

    return function (next) {
      self.invoke(resolved + (context ? ':' + context : ''), options, next);
    };
  };

  async.series(hooks.map(resolve), callback);

  return this;
};

/**
 * Registers a hook to invoke when this generator runs.
 *
 * A generator with a namespace based on the value supplied by the user
 * to the given option named `name`. An option is created when this method is
 * invoked and you can set a hash to customize it.
 *
 * Must be called prior to the generator run (shouldn't be called within
 * a generator "step" - top-level methods).
 *
 * ### Options:
 *
 *   - `as` The context value to use when runing the hooked generator
 *   - `args` The array of positional arguments to init and run the generator with
 *   - `options` An object containing a nested `options` property with the hash of options to use to init and run the generator with
 *
 * ### Examples:
 *
 *     // $ yo webapp --test-framework jasmine
 *     this.hookFor('test-framework');
 *     // => registers the `jasmine` hook
 *
 *     // $ yo mygen:subgen --myargument
 *     this.hookFor('mygen', {
 *       as: 'subgen',
 *       options: {
 *         options: {
 *           'myargument': true
 *         }
 *       }
 *     }
 *
 * @param {String} name
 * @param {Object} config
 */

Base.prototype.hookFor = function hookFor(name, config) {
  config = config || {};

  // enforce use of hookFor during instantiation
  if (this._running) {
    return this.emit('error', new Error(
      'hookFor must be used within the constructor only'
    ));
  }

  // add the corresponding option to this class, so that we output these hooks
  // in help
  this.option(name, {
    desc: this._.humanize(name) + ' to be invoked',
    defaults: this.options[name] || ''
  });

  this._hooks.push(_.defaults(config, {
    name: name
  }));

  return this;
};

/**
 * Return the default value for the option name.
 *
 * Also performs a lookup in CLI options and the `this.fallbacks`
 * property.
 *
 * @param {String} name
 */

Base.prototype.defaultFor = function defaultFor(name) {
  var config = this.fallbacks;

  if (this.options[name]) {
    name = this.options[name];
  } else if (config && config[name]) {
    name = config[name];
  }

  return name;
};

/**
 * Generate the default banner for help output, adjusting output to
 * argument type.
 *
 * Options:
 *
 *   - `name` Uppercased value to display (only relevant with `String` type)
 *   - `type` String, Number, Object or Array
 *
 * @param {Object} config
 */

Base.prototype.bannerFor = function bannerFor(config) {
  return config.type === Boolean ? '' :
    config.type === String ? config.name.toUpperCase() :
    config.type === Number ? 'N' :
    config.type === Object ? 'key:value' :
    config.type === Array ? 'one two three' :
    '';
};

/**
 * Tries to get the description from a USAGE file one folder above the
 * source root otherwise uses a default description.
 */

Base.prototype.help = function help() {
  var filepath = path.join(this.sourceRoot(), '../USAGE');
  var exists = fs.existsSync(filepath);

  var out = [
    'Usage:',
    '  ' + this.usage(),
    ''
  ];

  // build options
  if (this._options.length) {
    out = out.concat([
      'Options:',
      this.optionsHelp(),
      ''
    ]);
  }

  // build arguments
  if (this._arguments.length) {
    out = out.concat([
      'Arguments:',
      this.argumentsHelp(),
      ''
    ]);
  }

  // append USAGE file is any
  if (exists) {
    out.push(fs.readFileSync(filepath, 'utf8'));
  }

  return out.join('\n');
};

/**
 * Output usage information for this given generator, depending on its arguments,
 * options or hooks.
 */

Base.prototype.usage = function usage() {
  var options = this._options.length ? '[options]' : '';
  var name = ' ' + this.options.namespace;
  var args = '';

  if (this._arguments.length) {
    args = this._arguments.map(formatArg).join(' ');
  }

  name = name.replace(/^yeoman:/, '');

  var out = 'yo' + name + ' ' + options + ' ' + args;

  if (this.description) {
    out += '\n\n' + this.description;
  }

  return out;
};

function formatArg(argItem) {
  var arg = '<' + argItem.name + '>';

  if (!argItem.config.required) {
    arg = '[' + arg + ']';
  }

  return arg;
}

/**
 * Simple setter for custom `description` to append on help output.
 *
 * @param {String} description
 */

Base.prototype.desc = function desc(description) {
  this.description = description || '';
  return this;
};

Base.prototype.argumentsHelp = function argumentsHelp() {
  var rows = this._arguments.map(function (a) {
    return [
      '',
      a.name ? a.name : '',
      a.config.type ? '# Type: ' + a.config.type.name : '',
      'Required: ' + a.config.required
    ];
  });

  return this.log.table({
    rows: rows
  });
};

/**
 * Returns the list of options in formatted table.
 */

Base.prototype.optionsHelp = function optionsHelp() {
  var options = this._options.filter(function (el) {
    return !el.hide;
  });

  var hookOpts = this._hooks.map(function (hook) {
    return hook.generator && hook.generator._options;
  }).reduce(function (a, b) {
    a = a.concat(b);
    return a;
  }, []).filter(function (opts) {
    return opts && opts.name !== 'help';
  });

  var rows = options.concat(hookOpts).map(function (o) {
    return [
      '',
      o.alias ? '-' + o.alias + ', ' : '',
      '--' + o.name,
      o.desc ? '# ' + o.desc : '',
      o.defaults == null ? '' : 'Default: ' + o.defaults
    ];
  });

  return this.log.table({
    rows: rows
  });
};

/**
 * Determine the root generator name (the one who's extending Base).
 */

Base.prototype.rootGeneratorName = function () {
  var path = findup('package.json', { cwd: this.resolved });
  return path ? JSON.parse(fs.readFileSync(path, 'utf8')).name : '*';
};

/**
 * Setup a storage instance.
 * @private
 */

Base.prototype._setStorage = function () {
  var storePath = path.join(this.destinationRoot(), '.yo-rc.json');
  this.config = new Storage(this.rootGeneratorName(), storePath);
};

/**
 * Change the generator destination root directory.
 * This path is used to find storage, when using `this.dest` and `this.src` and for
 * multiple file actions (like `this.write` and `this.copy`)
 * @param  {String} rootPath new destination root path
 * @return {String}          destination root path
 */

Base.prototype.destinationRoot = function (rootPath) {
  if (_.isString(rootPath)) {
    this._destinationRoot = path.resolve(rootPath);

    if (!fs.existsSync(rootPath)) {
      this.mkdir(rootPath);
    }

    process.chdir(rootPath);

    // Reset the storage
    this._setStorage();

    // Update file helpers path bases
    this.dest.setBase(this._destinationRoot);
    this.src.setDestBase(this._destinationRoot);
  }

  return this._destinationRoot || process.cwd();
};

/**
 * Change the generator source root directory.
 * This path is used by `this.dest` and `this.src` and multiples file actions like
 * (`this.read` and `this.copy`)
 * @param  {String} rootPath new source root path
 * @return {String}          source root path
 */

Base.prototype.sourceRoot = function (rootPath) {
  if (_.isString(rootPath)) {
    this._sourceRoot = path.resolve(rootPath);

    // Update file helpers path bases
    this.src.setBase(this._sourceRoot);
    this.dest.setDestBase(this._sourceRoot);
  }

  return this._sourceRoot;
};

/**
 * Return a file Env validation filter checking for collision
 */

Base.prototype.getCollisionFilter = function () {
  var self = this;
  return function checkForCollisionFilter(output) {
    var done = this.async();

    self.checkForCollision(output.path, output.contents, function (err, config) {
      if (err) {
        done(false);
        config.callback(err);
        return this.emit('error', err);
      }

      if (!/force|create/.test(config.status)) {
        done('Skip modifications to ' + output.path);
      }

      done(true);
      return config.callback();
    });
  };
};

/**
 * Extend this Class to create a new one inherithing this one.
 * Also add a helper __super__ object poiting to the parent prototypes methods
 * @param  {Object} protoProps  Prototype properties (available on the instances)
 * @param  {Object} staticProps Static properties (available on the contructor)
 * @return {Object}             New sub class
 */
Base.extend = require('class-extend').extend;
