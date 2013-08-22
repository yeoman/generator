var fs = require('fs');
var util = require('util');
var path = require('path');
var events = require('events');
var _ = require('lodash');
var async = require('async');
var findup = require('findup-sync');
var chalk = require('chalk');

var engines = require('./util/engines');
var conflicter = require('./util/conflicter');
var Storage = require('./util/storage');
var actions = require('./actions/actions');

// TOOD(mklabs): flesh out api, remove config (merge with options, or just remove the
// grunt config handling)

/**
 * The `Base` object provides the common API shared by all generators,
 * defining options, arguments, hooks, file, prompt, log, API etc.
 *
 * Every generator should extend from this object.
 *
 * @param {String|Array} args
 * @param {Object} options
 */

var Base = module.exports = function Base(args, options) {
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

  this.conflicter = conflicter;
  this.conflicter.force = this.options.force;

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

  this._setStorage();

  this.option('help', {
    alias: 'h',
    desc: 'Print generator\'s options and usage'
  });

  // ensure source/destination path, can be configured from subclasses
  this.sourceRoot(path.join(path.dirname(this.resolved), 'templates'));
};

util.inherits(Base, events.EventEmitter);

// "include" the actions modules
_.extend(Base.prototype, actions);
_.extend(Base.prototype, require('./actions/fetch'));
_.extend(Base.prototype, require('./actions/file'));
_.extend(Base.prototype, require('./actions/install'));
_.extend(Base.prototype, require('./actions/string'));
_.extend(Base.prototype, require('./actions/wiring'));
_.extend(Base.prototype, require('./util/common'));
Base.prototype.user = require('./actions/user');
Base.prototype.shell = require('shelljs');
Base.prototype.prompt = require('./actions/prompt');
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

  if (config.required && value === undefined) {
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
      self[method].apply(self, args);

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
    var options = hook.options || self.options;
    options.args = hook.args || self.args;

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
 *   - `options` The hash of options to use to init and run the generator with
 *
 * ### Examples:
 *
 *     // $ yo webapp --test-framework jasmine
 *     this.hookFor('test-framework');
 *     // => registers the `jasmine` hook
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
  var args = this._arguments.map(function (arg) {
    return arg.config.banner;
  }).join(' ');

  var options = this._options.length ? '[options]' : '',
    name = (this.namespace === 'yeoman:app' || !this.namespace) ? '' : this.namespace + ' ',
    cmd = 'init';

  name = name.replace(/^yeoman:/, '');

  var out = 'yeoman ' + cmd + ' ' + name + args + ' ' + options;

  if (this.description) {
    out += '\n\n' + this.description;
  }

  return out;
};

/**
 * Simple setter for custom `description` to append on help output.
 *
 * @param {String} description
 */

Base.prototype.desc = function desc(description) {
  this.description = description || '';
  return this;
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
  return JSON.parse(fs.readFileSync(path, 'utf8')).name;
};

/**
 * Setup a storage instance.
 */

Base.prototype._setStorage = function () {
  var storePath = path.join(actions.destinationRoot.call(this), '.yo-rc.json');
  this.config = new Storage(this.rootGeneratorName(), storePath);
};

/**
 * Façace `actions.destinationRoot` on Base generator so it update the storage
 * path when the path change.
 *
 * @param {String} rootPath
 */

Base.prototype.destinationRoot = function (rootPath) {
  var root = actions.destinationRoot.call(this, rootPath);
  if (rootPath) {
    this._setStorage();
  }
  return root;
};
