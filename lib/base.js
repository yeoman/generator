'use strict';
var fs = require('fs');
var util = require('util');
var path = require('path');
var events = require('events');
var assert = require('assert');
var _ = require('lodash');
var async = require('async');
var findup = require('findup-sync');
var chalk = require('chalk');
var file = require('file-utils');
var nopt = require('nopt');
var through = require('through2');
var userHome = require('user-home');
var GruntfileEditor = require('gruntfile-editor');
var FileEditor = require('mem-fs-editor');

var engines = require('./util/engines');
var Conflicter = require('./util/conflicter');
var Storage = require('./util/storage');
var promptSuggestion = require('./util/prompt-suggestion');

var fileLogger = { write: _.noop, warn: _.noop };

/**
 * The `Base` class provides the common API shared by all generators.
 * It define options, arguments, hooks, file, prompt, log, API, etc.
 *
 * It mixes on its prototype all methods you'll find in the `actions/` mixins.
 *
 * Every generator should extend this base class.
 *
 * @constructor
 * @mixes util/common
 * @mixes actions/actions
 * @mixes actions/fetch
 * @mixes actions/file
 * @mixes actions/install
 * @mixes actions/invoke
 * @mixes actions/spawn_command
 * @mixes actions/string
 * @mixes actions/remote
 * @mixes actions/user
 * @mixes actions/wiring
 * @mixes actions/help
 * @mixes nodejs/EventEmitter
 *
 * @param {String|Array} args
 * @param {Object} options
 *
 * @property {Object}   env         - the current Environment being run
 * @property {Object}   args        - Provide arguments at initialization
 * @property {String}   resolved    - the path to the current generator
 * @property {String}   description - Used in `--help` output
 * @property {String}   appname     - The application name
 * @property {Storage}  config      - `.yo-rc` config file manager
 * @property {Object}   fs          - An instance of {@link https://github.com/SBoudrias/mem-fs-editor Mem-fs-editor}
 * @property {Function} log         - Output content through Interface Adapter
 *
 * @example
 * var generator = require('yeoman-generator');
 * var MyGenerator = generator.Base.extend({
 *   writing: function() {
 *     this.fs.write('var foo = 1;', this.destinationPath('index.js'));
 *   }
 * });
 */

var Base = module.exports = function Base(args, options) {
  events.EventEmitter.call(this);

  if (!Array.isArray(args)) {
    options = args;
    args = [];
  }

  this.options = options || {};
  this._args = args || [];
  this._options = {};
  this._arguments = [];
  this._hooks = [];
  this._composedWith = [];
  this._transformStreams = [];
  this.appname = this.determineAppname();

  this.option('help', {
    alias: 'h',
    desc: 'Print generator\'s options and usage'
  });

  this.option('skip-cache', {
    type: Boolean,
    desc: 'Do not remember prompt answers',
    defaults: false
  });

  // checks required paramaters
  assert(this.options.env, 'You must provide the environment object. Use env#create() to create a new generator.');
  assert(this.options.resolved, 'You must provide the resolved path value. Use env#create() to create a new generator.');
  this.env = this.options.env;
  this.resolved = this.options.resolved;

  require('yeoman-environment').enforceUpdate(this.env);

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

  this.conflicter = new Conflicter(this.env.adapter, this.options.force);

  // Since log is both a function and an object we need to use Object.defineProperty
  // instead of this.env.adapter.log.apply o similar approaches
  this.log = this.env.adapter.log;

  // determine the app root
  var rootPath = findup('.yo-rc.json');
  rootPath = rootPath ? path.dirname(rootPath) : process.cwd();
  if (rootPath !== process.cwd()) {
    this.log(
      '\n' +
      'Just found a `.yo-rc.json` in a parent directory.\n' +
      'Setting the project root at: ' + rootPath + '\n'
    );
    process.chdir(rootPath);
  }

  // Set the file-utils environments
  // Set logger as a noop as logging is handled by the yeoman conflicter
  this.src = file.createEnv({
    base: this.sourceRoot.bind(this),
    dest: this.destinationRoot.bind(this),
    logger: fileLogger
  });
  this.dest = file.createEnv({
    base: this.destinationRoot.bind(this),
    dest: this.sourceRoot.bind(this),
    logger: fileLogger
  });
  this.fs = FileEditor.create(this.env.sharedFs);

  // Register collision filters which return true if the file can be written to
  this.dest.registerValidationFilter('collision', this.getCollisionFilter());
  this.src.registerValidationFilter('collision', this.getCollisionFilter());

  this.config = this._getStorage();
  this._globalConfig = this._getGlobalStorage();

  // ensure source/destination path, can be configured from subclasses
  this.sourceRoot(path.join(path.dirname(this.resolved), 'templates'));

  // Only instantiate the Gruntfile API when requested
  Object.defineProperty(this, 'gruntfile', {
    get: function () {
      var gruntfile;
      if (!this.env.gruntfile) {
        // Use actual Gruntfile.js or the default one
        try {
          gruntfile = this.dest.read('Gruntfile.js');
        } catch (e) {}
        this.env.gruntfile = new GruntfileEditor(gruntfile);
      }

      // Schedule the creation/update of the Gruntfile
      this.env.runLoop.add('writing', function (done) {
        this.dest.write('Gruntfile.js', this.env.gruntfile.toString());
        done();
      }.bind(this), { once: 'gruntfile:write' });

      return this.env.gruntfile;
    }
  });
};

util.inherits(Base, events.EventEmitter);

// Mixin the actions modules
_.extend(Base.prototype, require('./actions/actions'));
_.extend(Base.prototype, require('./actions/fetch'));
_.extend(Base.prototype, require('./actions/file'));
_.extend(Base.prototype, require('./actions/install'));
_.extend(Base.prototype, require('./actions/string'));
_.extend(Base.prototype, require('./actions/remote'));
_.extend(Base.prototype, require('./actions/wiring'));
_.extend(Base.prototype, require('./actions/help'));
_.extend(Base.prototype, require('./util/common'));
Base.prototype.user = require('./actions/user');

Base.prototype.prompt = function (questions, callback) {
  questions = promptSuggestion.prefillQuestions(this._globalConfig, questions);

  this.env.adapter.prompt(questions, function (answers) {
    if (!this.options['skip-cache']) {
      promptSuggestion.storeAnswers(this._globalConfig, questions, answers);
    }

    if (_.isFunction(callback)) {
      callback(answers);
    }
  }.bind(this));

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
 *   - `defaults` Default value
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
    defaults: undefined,
    hide: false
  });

  if (this._options[name] == null) {
    this._options[name] = config;
  }

  if (this.options[name] == null) {
    this.options[name] = config.defaults;
  }

  this.parseOptions();

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
 *
 * @param {String} name
 * @param {Object} config
 */

Base.prototype.argument = function argument(name, config) {
  config = config || {};
  _.defaults(config, {
    name: name,
    required: config.defaults == null,
    type: String
  });

  var position = this._arguments.length;
  this._arguments.push({
    name: name,
    config: config
  });

  Object.defineProperty(this, name, {
    configurable: true,
    enumerable: true,
    get: function () {
      // a bit of coercion and type handling, to be improved
      // just dealing with Array/String, default is assumed to be String
      var value = config.type === Array ? this.args.slice(position) : this.args[position];
      return position >= this.args.length ? config.defaults : value;
    },
    set: function (value) {
      this.args[position] = value;
    }
  });

  this.checkRequiredArgs();

  return this;
};

Base.prototype.parseOptions = function () {
  var opts = {};
  var shortOpts = {};
  _.each(this._options, function (option) {
    opts[option.name] = option.type;
    if (option.alias) {
      shortOpts[option.alias] = '--' + option.name;
    }
  });
  opts = nopt(opts, shortOpts, this._args, 0);

  _.extend(this.options, opts);

  this.args = this.arguments = opts.argv.remain;
  this.checkRequiredArgs();
};

Base.prototype.checkRequiredArgs = function () {
  // If the help option was provided, we don't want to check for required arguments,
  // since we're only going to print the help message anyway.
  if (this.options.help) { return; }

  // Bail early if it's not possible to have a missing required arg
  if (this.args.length > this._arguments.length) { return;}

  this._arguments.forEach(function (arg, position) {
    // If the help option was not provided, check whether the argument was required,
    // and whether a value was provided.
    if (arg.config.required && position >= this.args.length) {
      return this.emit('error', new Error('Did not provide required argument ' + chalk.bold(arg.name) + '!'));
    }
  }, this);
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
 * @param {String|Array|Function} [args]
 * @param {Function} [cb]
 */

Base.prototype.run = function run(args, cb) {
  var self = this;
  this._running = true;
  this.emit('run');

  if (!cb) {
    cb = args;
    args = this.args;
  }

  args = _.isString(args) ? args.split(' ') : args;
  cb = cb || function () {};

  var methods = Object.keys(Object.getPrototypeOf(this));

  assert(methods.length, 'This Generator is empty. Add at least one method for it to run.');

  this.env.runLoop.once('end', function () {
    this.emit('end');
    cb();
  }.bind(this));

  // Ensure a prototype method is candidate to be run by default
  function methodIsValid(name) {
    return name.charAt(0) !== '_' && name !== 'constructor';
  }

  function addMethod(method, methodName, queueName) {
    self.env.runLoop.add(queueName || 'default', function (completed) {
      var done = function (err) {
        if (err) self.emit('error', err);
        completed();
      };

      var running = false;
      self.async = function () {
        running = true;
        return done;
      };

      self.emit('method:' + methodName);
      try {
        method.apply(self, args);
        if (!running) return done();
      } catch (err) {
        self.emit('error', err);
      }
    });
  }

  function addInQueue(name) {
    var item = Object.getPrototypeOf(self)[name];
    var queueName = self.env.runLoop.queueNames.indexOf(name) >= 0 ? name : null;

    // Name points to a function; run it!
    if (_.isFunction(item)) {
      return addMethod(item, name, queueName);
    }

    // Not a queue hash; stop
    if (!queueName) return;

    // Run each queue items
    _.each(item, function (method, methodName) {
      if (!_.isFunction(method) || !methodIsValid(methodName)) return;
      addMethod(method, methodName, queueName);
    });
  }

  methods.filter(methodIsValid).forEach(addInQueue);

  this.env.runLoop.add('conflicts', this._writeFiles.bind(this), {
    once: 'write memory fs to disk'
  });

  // Add the default conflicts handling
  this.env.runLoop.add('conflicts', function (done) {
    this.conflicter.resolve(function (err) {
      if (err) this.emit('error', err);
      done();
    }.bind(this));
  }.bind(this));

  this.on('end', function () {
    this.runHooks();
  });

  _.invoke(this._composedWith, 'run');

  return this;
};

/**
 * Goes through all registered hooks, invoking them in series.
 *
 * @param {Function} [cb]
 */

Base.prototype.runHooks = function runHooks(cb) {
  cb = _.isFunction(cb) ? cb : function () {};

  var setupInvoke = function (hook) {
    var resolved = this.defaultFor(hook.name);
    var options = _.clone(hook.options || this.options);
    options.args = _.clone(hook.args || this.args);

    return function (next) {
      this.invoke(resolved + (hook.as ? ':' + hook.as : ''), options, next);
    }.bind(this);
  }.bind(this);

  async.series(this._hooks.map(setupInvoke), cb);

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
 *   - `as`      The context value to use when runing the hooked generator
 *   - `args`    The array of positional arguments to init and run the generator with
 *   - `options` An object containing a nested `options` property with the hash of options
 *               to use to init and run the generator with
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
  assert(!this._running, 'hookFor can only be used inside the constructor function');

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
  return this.options[name] || name;
};

/**
 * Compose this generator with another one.
 * @param  {String} namespace  The generator namespace to compose with
 * @param  {Object} options    The options passed to the Generator
 * @param  {Object} [settings] Settings hash on the composition relation
 * @param  {string} [settings.local]        Path to a locally stored generator
 * @param  {String} [settings.link="weak"]  If "strong", the composition will occured
 *                                          even when the composition is initialized by
 *                                          the end user
 * @return {this}
 *
 * @example <caption>Using a peerDependency generator</caption>
 * this.composeWith('bootstrap', { options: { sass: true } });
 *
 * @example <caption>Using a direct dependency generator</caption>
 * this.composeWith('bootstrap', { options: { sass: true } }, {
 *   local: require.resolve('generator-bootstrap/app/main.js');
 * });
 */

Base.prototype.composeWith = function composeWith(namespace, options, settings) {
  settings = settings || {};
  var generator;
  if (settings.local) {
    var Generator = require(settings.local);
    Generator.resolved = require.resolve(settings.local);
    Generator.namespace = namespace;
    generator = this.env.instantiate(Generator, options);
  } else {
    generator = this.env.create(namespace, options);
  }

  if (this._running) {
    generator.run();
  } else {
    this._composedWith.push(generator);
  }
  return this;
};

/**
 * Determine the root generator name (the one who's extending Base).
 * @return {String} The name of the root generator
 */

Base.prototype.rootGeneratorName = function () {
  var filepath = findup('package.json', { cwd: this.resolved });
  return filepath ? this.fs.readJSON(filepath).name : '*';
};

/**
 * Determine the root generator version (the one who's extending Base).
 * @return {String} The version of the root generator
 */

Base.prototype.rootGeneratorVersion = function () {
  var filepath = findup('package.json', { cwd: this.resolved });
  return filepath ? this.fs.readJSON(filepath).version : '0.0.0';
};

/**
 * Return a storage instance.
 * @return {Storage} Generator storage
 * @private
 */

Base.prototype._getStorage = function () {
  var storePath = path.join(this.destinationRoot(), '.yo-rc.json');
  return new Storage(this.rootGeneratorName(), this.fs, storePath);
};

/**
 * Setup a globalConfig storage instance.
 * @return {Storage} Global config storage
 * @private
 */

Base.prototype._getGlobalStorage = function () {
  var storePath = path.join(userHome, '.yo-rc-global.json');
  var storeName = util.format('%s:%s', this.rootGeneratorName(), this.rootGeneratorVersion());
  return new Storage(storeName, this.fs, storePath);
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
    this.config = this._getStorage();
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
  }

  return this._sourceRoot;
};

/**
 * Join a path to the source root.
 * @param  {...String} path
 * @return {String}    joined path
 */

Base.prototype.templatePath = function () {
  var args = [this.sourceRoot()].concat(_.toArray(arguments));
  return path.join.apply(path, args);
};

/**
 * Join a path to the destination root.
 * @param  {...String} path
 * @return {String}    joined path
 */

Base.prototype.destinationPath = function () {
  var args = [this.destinationRoot()].concat(_.toArray(arguments));
  return path.join.apply(path, args);
};

/**
 * Return a file Env validation filter checking for collision
 */

Base.prototype.getCollisionFilter = function () {
  var self = this;
  return function checkForCollisionFilter(output) {
    var done = this.async();

    self.conflicter.checkForCollision(output.path, output.contents, function (err, status) {
      if (err) {
        done(false);
        return self.emit('error', err);
      }

      if (!/force|create/.test(status)) {
        return done('Skip modifications to ' + output.path);
      }

      return done(true);
    });
  };
};

/**
 * Determines the name of the application.
 *
 * First checks for name in bower.json.
 * Then checks for name in package.json.
 * Finally defaults to the name of the current directory.
 * @return {String} The name of the application
 */
Base.prototype.determineAppname = function () {
  var appname;

  try {
    appname = require(path.join(process.cwd(), 'bower.json')).name;
  } catch (e) {
    try {
      appname = require(path.join(process.cwd(), 'package.json')).name;
    } catch (e) {}
  }

  if (!appname) {
    appname = path.basename(process.cwd());
  }

  return appname.replace(/[^\w\s]+?/g, ' ');
};

Base.prototype.registerTransformStream = function (stream) {
  assert(stream, 'expected to receive a transform stream as parameter');
  this._transformStreams.push(stream);
  return this;
};

/**
 * Write memory fs file to disk and logging results
 * @param {Function} done - callback once files are written
 */
Base.prototype._writeFiles = function (done) {
  var self = this;

  var conflictChecker = through.obj(function (file, enc, cb) {
    var stream = this;

    // Config file should not be processed by the conflicter. Just pass through
    var filename = path.basename(file.path);
    if (filename === '.yo-rc.json' || filename === '.yo-rc-global.json') {
      this.push(file);
      return cb();
    }

    self.conflicter.checkForCollision(file.path, file.contents.toString(), function (err, status) {
      if (err) return cb(err);
      if (status !== 'skip') {
        stream.push(file);
      }
      cb();
    });
    self.conflicter.resolve();
  });

  var transformStreams = this._transformStreams.concat([conflictChecker]);
  this.fs.commit(transformStreams, function () {
    done();
  });
};

/**
 * Extend this Class to create a new one inherithing this one.
 * Also add a helper \_\_super__ object pointing to the parent prototypes methods
 * @param  {Object} protoProps  Prototype properties (available on the instances)
 * @param  {Object} staticProps Static properties (available on the contructor)
 * @return {Object}             New sub class
 */
Base.extend = require('class-extend').extend;
