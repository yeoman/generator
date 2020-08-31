'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const EventEmitter = require('events');
const assert = require('assert');
const _ = require('lodash');
const findUp = require('find-up');
const semver = require('semver');
const readPkgUp = require('read-pkg-up');
const chalk = require('chalk');
const makeDir = require('make-dir');
const minimist = require('minimist');
const runAsync = require('run-async');
const through = require('through2');
const createDebug = require('debug');

const Conflicter = require('./util/conflicter');
const Storage = require('./util/storage');
const promptSuggestion = require('./util/prompt-suggestion');

const EMPTY = '@@_YEOMAN_EMPTY_MARKER_@@';
const debug = createDebug('yeoman:generator');
const ENV_VER_WITH_VER_API = '2.9.0';

// Ensure a prototype method is a candidate run by default
const methodIsValid = function(name) {
  return !['_', '#'].includes(name.charAt(0)) && name !== 'constructor';
};

// New runWithOptions should take precedence if exists.
const runGenerator = generator => {
  if (generator.runWithOptions) {
    generator.runWithOptions();
  } else {
    generator.run();
  }
};

/**
 * Queue options.
 * @typedef {Object} QueueOptions
 * @property {string} [queueName] - Name of the queue.
 * @property {boolean} [once] - Execute only once by namespace and taskName.
 * @property {boolean} [run] - Run the queue if not running yet.
 */

/**
 * Task options.
 * @typedef {QueueOptions} TaskOptions
 * @property {Function} [reject] - Reject callback.
 */

/**
 * Priority object.
 * @typedef {QueueOptions} Priority
 * @property {string} priorityName - Name of the priority.
 * @property {string} [before] - The queue which this priority should be added before.
 */

/**
 * Complete Task object.
 * @typedef {TaskOptions} Task
 * @property {WrappedMethod} method - Function to be queued.
 * @property {string} taskName - Name of the task.
 */

/**
 * RunAsync creates a promise and executes wrappedMethod inside the promise.
 * It replaces async property of the wrappedMethod's context with one RunAsync provides.
 * async() simulates an async function by creating a callback.
 *
 * It supports promises/async and sync functions.
 * - Promises/async: forward resolve/reject from the runAsync promise to the
 *   promise returned by the wrappedMethod.
 * - Sync functions: resolves with the returned value.
 *   Can be a promise for chaining
 * - Sync functions with callback (done = this.async()) calls:
 *   Reject with done(rejectValue) first argument
 *   Resolve with done(undefined, resolveValue) second argument
 * - Callback must called when 'async()' was called inside a sync function.
 * - Callback can be ignored when 'async()' was called inside a async function.
 * @typedef {Function} WrappedMethod
 */

class Generator extends EventEmitter {
  // If for some reason environment adds more queues, we should use or own for stability.
  static get queues() {
    return [
      'initializing',
      'prompting',
      'configuring',
      'default',
      'writing',
      'conflicts',
      'install',
      'end'
    ];
  }

  /* eslint-disable complexity */
  /**
   * @classdesc The `Generator` class provides the common API shared by all generators.
   * It define options, arguments, file, prompt, log, API, etc.
   *
   * It mixes into its prototype all the methods found in the `actions/` mixins.
   *
   * Every generator should extend this base class.
   *
   * @constructor
   * @mixes actions/help
   * @mixes actions/install
   * @mixes actions/spawn-command
   * @mixes actions/user
   * @mixes actions/fs
   * @mixes nodejs/EventEmitter
   *
   * @param {string[]} args           - Provide arguments at initialization
   * @param {Object} options          - Provide options at initialization
   * @param {Priority[]} [options.customPriorities] - Custom priorities
   *
   * @property {Object}   env         - the current Environment being run
   * @property {String}   resolved    - the path to the current generator
   * @property {String}   description - Used in `--help` output
   * @property {String}   appname     - The application name
   * @property {Storage}  config      - `.yo-rc` config file manager
   * @property {Object}   fs          - An instance of {@link https://github.com/SBoudrias/mem-fs-editor Mem-fs-editor}
   * @property {Function} log         - Output content through Interface Adapter
   *
   * @example
   * const Generator = require('yeoman-generator');
   * module.exports = class extends Generator {
   *   writing() {
   *     this.fs.write(this.destinationPath('index.js'), 'const foo = 1;');
   *   }
   * };
   */
  constructor(args, options) {
    super();

    if (!Array.isArray(args)) {
      options = args;
      args = [];
    }

    options = options || {};
    this.options = options;
    this._initOptions = _.clone(options);
    this._args = args || [];
    this._options = {};
    this._arguments = [];
    this._prompts = [];
    this._composedWith = [];
    this._transformStreams = [];
    this._namespace = this.options.namespace;
    this._namespaceId = this.options.namespaceId;

    this.option('help', {
      type: Boolean,
      alias: 'h',
      description: "Print the generator's options and usage"
    });

    this.option('skip-cache', {
      type: Boolean,
      description: 'Do not remember prompt answers',
      default: false
    });

    this.option('skip-install', {
      type: Boolean,
      description: 'Do not automatically install dependencies',
      default: false
    });

    this.option('force-install', {
      type: Boolean,
      description: 'Fail on install dependencies error',
      default: false
    });

    this.option('ask-answered', {
      type: Boolean,
      description: 'Show prompts for already configured options',
      default: false
    });

    this.resolved = this.options.resolved || __dirname;
    this.description = this.description || '';

    if (this.options.help) {
      this.options.localConfigOnly = true;
    }

    this.env = this.options.env;

    // Make sure we have a full featured environment.
    try {
      const Environment = require('yeoman-environment');
      if (!this.env) {
        this.env = Environment.createEnv();
      } else if (Object.getPrototypeOf(this.env) === Object.prototype) {
        debug('Converting env from a simple object to an Environment');
        const env = Environment.createEnv();
        Object.assign(env, this.env);
        this.env = env;
      } else {
        Environment.enforceUpdate(this.env);
      }
    } catch (error) {
      const env = this.env;
      if (!env) {
        throw new Error('This generator requires an environment.');
      }

      if (Object.getPrototypeOf(this.env) === Object.prototype) {
        console.log(
          'Current Environment is a plain object, some features can be missing'
        );
      }

      // Ensure the environment support features this yeoman-generator version require.
      if (!env.adapter || !env.runLoop || !env.sharedFs) {
        throw new Error(
          "Current environment doesn't provides some necessary feature this generator needs"
        );
      }
    }

    this.fs = require('mem-fs-editor').create(this.env.sharedFs);

    // Place holder for run-async callback.
    this.async = () => () => {};

    this.conflicter = new Conflicter(this.env.adapter, this.options.force, {
      bail: this.options.bail,
      ignoreWhitespace: this.options.whitespace,
      skipRegenerate: this.options.skipRegenerate,
      dryRun: this.options.dryRun
    });

    // Mirror the adapter log method on the generator.
    //
    // example:
    // this.log('foo');
    // this.log.error('bar');
    this.log = this.env.adapter.log;

    // Add convenience debug object
    this._debug = createDebug(this.options.namespace || 'yeoman:unknownnamespace');

    // Determine the app root
    this.contextRoot = this.env.cwd;
    this._destinationRoot = this.options.destinationRoot;

    if (this.options.localConfigOnly) {
      debug('Using local configurations only');
    } else if (!this._destinationRoot) {
      let rootPath = findUp.sync('.yo-rc.json', {
        cwd: this.env.cwd
      });
      rootPath = rootPath ? path.dirname(rootPath) : this.env.cwd;

      if (rootPath !== this.env.cwd) {
        this.log(
          [
            '',
            'Just found a `.yo-rc.json` in a parent directory.',
            'Setting the project root at: ' + rootPath
          ].join('\n')
        );
        this.destinationRoot(rootPath);
      }
    }

    this.appname = this.determineAppname();
    this.config = this._getStorage();
    if (this._namespaceId && this._namespaceId.generator) {
      this.generatorConfig = this.config.createStorage(`:${this._namespaceId.generator}`);
      if (this._namespaceId.instanceId) {
        this.instanceConfig = this.generatorConfig.createStorage(
          `#${this._namespaceId.instanceId}`
        );
      }
    }

    this._globalConfig = this._getGlobalStorage();

    // Ensure source/destination path, can be configured from subclasses
    this.sourceRoot(path.join(path.dirname(this.resolved), 'templates'));

    // Queues map: generator's queue name => grouped-queue's queue name (custom name)
    this._queues = {};

    // Add original queues.
    Generator.queues.forEach(queue => {
      this._queues[queue] = { priorityName: queue, queueName: queue };
    });

    // Add custom queues
    if (Array.isArray(this.options.customPriorities)) {
      this.registerPriorities(this.options.customPriorities);
    }

    this.compose = this.options.compose;

    // Expose utilities for dependency-less generators.
    this._ = _;
  }

  /**
   * Register priorities for this generator
   *
   * @param  {Object[]} priorities - Priorities
   * @param  {String} priorities.priorityName - Priority name
   * @param  {String} priorities.before - The new priority will be queued before the `before` priority.
   * @param  {String} [priorities.queueName] - Name to be used at grouped-queue
   */
  registerPriorities(priorities) {
    const customPriorities = priorities.map(customPriority => {
      // Keep backward compatibility with name
      const newPriority = { priorityName: customPriority.name, ...customPriority };
      delete newPriority.name;
      return newPriority;
    });

    // Sort customPriorities, a referenced custom queue must be added before the one that reference it.
    customPriorities.sort((a, b) => {
      if (a.priorityName === b.priorityName) {
        throw new Error(`Duplicate custom queue ${a.name}`);
      }

      if (a.priorityName === b.before) {
        return -1;
      }

      if (b.priorityName === a.before) {
        return 1;
      }

      return 0;
    });

    // Add queue to runLoop
    customPriorities.forEach(customQueue => {
      customQueue.queueName =
        customQueue.queueName || `${this.options.namespace}#${customQueue.priorityName}`;
      debug(`Registering custom queue ${customQueue.queueName}`);
      this._queues[customQueue.priorityName] = customQueue;

      if (this.env.runLoop.queueNames.includes(customQueue.queueName)) {
        return;
      }

      // Backwards compatibilitiy with grouped-queue < 1.0.0
      if (!this.env.runLoop.addSubQueue) {
        let SubQueue;
        try {
          SubQueue = require('grouped-queue/lib/subqueue');
        } catch (error) {
          throw new Error(
            "The running environment doesn't have the necessary features to run this generator. Update it and run again."
          );
        }

        this.env.runLoop.addSubQueue = function(name, before) {
          if (this.__queues__[name]) {
            // Sub-queue already exists
            return;
          }

          if (!before) {
            // Add at last place.
            this.__queues__[name] = new SubQueue();
            this.queueNames.push(name);
            return;
          }

          if (!this.__queues__[before] || _.indexOf(this.queueNames, before) === -1) {
            throw new Error('sub-queue ' + before + ' not found');
          }

          const current = this.__queues__;
          const currentNames = Object.keys(current);
          // Recreate the queue with new order.
          this.__queues__ = {};
          currentNames.forEach(currentName => {
            if (currentName === before) {
              this.__queues__[name] = new SubQueue();
            }

            this.__queues__[currentName] = current[currentName];
          });

          // Recreate queueNames
          this.queueNames = Object.keys(this.__queues__);
        };
      }

      let beforeQueue = customQueue.before
        ? this._queues[customQueue.before].queueName
        : undefined;
      this.env.runLoop.addSubQueue(customQueue.queueName, beforeQueue);
    });
  }

  checkEnvironmentVersion(packageDependency, version) {
    if (version === undefined) {
      version = packageDependency;
      packageDependency = 'yeoman-environment';
    }

    version = version || ENV_VER_WITH_VER_API;
    const returnError = currentVersion => {
      return new Error(
        `This generator (${this.options.namespace}) requires ${packageDependency} at least ${version}, current version is ${currentVersion}`
      );
    };

    if (!this.env.getVersion) {
      if (!this.options.ignoreVersionCheck) {
        throw returnError(`less than ${ENV_VER_WITH_VER_API}`);
      }

      console.warn(
        `It's not possible to check version with running Environment less than ${ENV_VER_WITH_VER_API}`
      );
      console.warn('Some features may be missing');
      if (semver.lte(version, '2.8.1')) {
        return undefined;
      }

      return false;
    }

    let runningVersion = this.env.getVersion(packageDependency);
    if (runningVersion !== undefined && semver.lte(version, runningVersion)) {
      return true;
    }

    if (this.options.ignoreVersionCheck) {
      console.warn(
        `Current ${packageDependency} is not compatible with current generator, min required: ${version} current version: ${runningVersion}. Some features may be missing.`
      );
      return false;
    }

    throw returnError(runningVersion);
  }

  /**
   * Convenience debug method
   *
   * @param  {any} args parameters to be passed to debug
   */
  debug(...args) {
    this._debug(...args);
  }

  /**
   * Register stored config prompts and optional option alternative.
   *
   * @param {Inquirer|Inquirer[]} questions - Inquirer question or questions.
   * @param {Object|Boolean} [questions.exportOption] - Additional data to export this question as an option.
   * @param {Storage|String} [question.storage=this.config] - Storage to store the answers.
   */
  registerConfigPrompts(questions) {
    questions = Array.isArray(questions) ? questions : [questions];
    const getOptionTypeFromInquirerType = type => {
      if (type === 'number') {
        return Number;
      }

      if (type === 'confirm') {
        return Boolean;
      }

      if (type === 'checkbox') {
        return Array;
      }

      return String;
    };

    questions.forEach(q => {
      const question = { ...q };
      if (q.exportOption) {
        let option = typeof q.exportOption === 'boolean' ? {} : q.exportOption;
        this.option({
          name: q.name,
          type: getOptionTypeFromInquirerType(q.type),
          description: q.message,
          ...option,
          storage: q.storage || this.config
        });
      }

      this._prompts.push(question);
    });
  }

  /**
   * Prompt user to answer questions. The signature of this method is the same as {@link https://github.com/SBoudrias/Inquirer.js Inquirer.js}
   *
   * On top of the Inquirer.js API, you can provide a `{cache: true}` property for
   * every question descriptor. When set to true, Yeoman will store/fetch the
   * user's answers as defaults.
   *
   * @param  {object|object[]} questions  Array of question descriptor objects. See {@link https://github.com/SBoudrias/Inquirer.js/blob/master/README.md Documentation}
   * @param  {Storage} [questions.storage] Store/fetch the question on the storage.
   * @param  {Storage} [storage] Storage object
   * @return {Promise} prompt promise
   */
  prompt(questions, storage) {
    const checkInquirer = () => {
      if (this.inquireSupportsPrefilled === undefined) {
        this.checkEnvironmentVersion();
        this.inquireSupportsPrefilled = this.checkEnvironmentVersion('inquirer', '7.1.0');
      }
    };

    if (storage !== undefined) {
      checkInquirer();
    }

    const storageForQuestion = {};

    const getAnswerFromStorage = function(question) {
      let questionStorage = question.storage || storage;
      questionStorage =
        typeof questionStorage === 'string' ? this[questionStorage] : questionStorage;
      if (questionStorage) {
        checkInquirer();

        const name = question.name;
        storageForQuestion[name] = questionStorage;
        const value = questionStorage.getPath(name);
        if (value !== undefined) {
          question.default = value;
        }

        return [name, value];
      }

      return undefined;
    };

    if (!Array.isArray(questions)) {
      questions = [questions];
    }

    // Shows the prompt even if the answer already exists.
    questions.forEach(question => {
      if (question.askAnswered === undefined) {
        question.askAnswered = this.options.askAnswered === true;
      }
    });

    // Pre-fill answers with storage values.
    const answers = {};
    questions
      .map(getAnswerFromStorage)
      .filter(a => a)
      .forEach(([key, value]) => {
        answers[key] = value;
      });

    questions = promptSuggestion.prefillQuestions(this._globalConfig, questions);
    questions = promptSuggestion.prefillQuestions(this.config, questions);

    return this.env.adapter.prompt(questions, answers).then(answers => {
      Object.entries(storageForQuestion).forEach(([name, questionStorage]) => {
        const answer = answers[name] === undefined ? null : answers[name];
        questionStorage.setPath(name, answer);
      });

      if (!this.options['skip-cache'] && !this.options.skipCache) {
        promptSuggestion.storeAnswers(this._globalConfig, questions, answers, false);
        if (!this.options.skipLocalCache) {
          promptSuggestion.storeAnswers(this.config, questions, answers, true);
        }
      }

      return answers;
    });
  }

  /**
   * Adds an option to the set of generator expected options, only used to
   * generate generator usage. By default, generators get all the cli options
   * parsed by nopt as a `this.options` hash object.
   *
   * @param {String} [name] - Option name
   * @param {Object} config - Option options
   * @param {any} config.type - Either Boolean, String or Number
   * @param {string} [config.description] - Description for the option
   * @param {any} [config.default] - Default value
   * @param {any} [config.alias] - Option name alias (example `-h` and --help`)
   * @param {any} [config.hide] - Boolean whether to hide from help
   * @param {Storage} [config.storage] - Storage to persist the option
   * @return {this} This generator
   */
  option(name, config) {
    if (Array.isArray(name)) {
      name.forEach(option => {
        this.option(option);
      });
      return;
    }

    if (typeof name === 'object') {
      config = name;
      name = config.name;
    }

    config = config || {};

    // Alias default to defaults for backward compatibility.
    if ('defaults' in config) {
      config.default = config.defaults;
    }

    config.description = config.description || config.desc;

    _.defaults(config, {
      name,
      description: 'Description for ' + name,
      type: Boolean,
      hide: false
    });

    // Check whether boolean option is invalid (starts with no-)
    const boolOptionRegex = /^no-/;
    if (config.type === Boolean && name.match(boolOptionRegex)) {
      const simpleName = name.replace(boolOptionRegex, '');
      return this.emit(
        'error',
        new Error(
          [
            `Option name ${chalk.yellow(name)} cannot start with ${chalk.red('no-')}\n`,
            `Option name prefixed by ${chalk.yellow('--no')} are parsed as implicit`,
            ` boolean. To use ${chalk.yellow('--' + name)} as an option, use\n`,
            chalk.cyan(`  this.option('${simpleName}', {type: Boolean})`)
          ].join('')
        )
      );
    }

    if (this._options[name] === null || this._options[name] === undefined) {
      this._options[name] = config;
    }

    this.parseOptions();
    if (config.storage && this.options[name] !== undefined) {
      const storage =
        typeof config.storage === 'string' ? this[config.storage] : config.storage;
      storage.set(name, this.options[name]);
    }

    return this;
  }

  /**
   * Adds an argument to the class and creates an attribute getter for it.
   *
   * Arguments are different from options in several aspects. The first one
   * is how they are parsed from the command line, arguments are retrieved
   * based on their position.
   *
   * Besides, arguments are used inside your code as a property (`this.argument`),
   * while options are all kept in a hash (`this.options`).
   *
   *
   * @param {String} name - Argument name
   * @param {Object} config - Argument options
   * @param {any} config.type - String, Number, Array, or Object
   * @param {string} [config.description] - Description for the argument
   * @param {boolean} [config.required] - required` Boolean whether it is required
   * @param {boolean} [config.optional] - Boolean whether it is optional
   * @param {any} [config.default] - Default value for this argument
   * @return {this} This generator
   */
  argument(name, config) {
    config = config || {};

    // Alias default to defaults for backward compatibility.
    if ('defaults' in config) {
      config.default = config.defaults;
    }

    config.description = config.description || config.desc;

    _.defaults(config, {
      name,
      required: config.default === null || config.default === undefined,
      type: String
    });

    this._arguments.push(config);

    this.parseOptions();
    return this;
  }

  parseOptions() {
    const minimistDef = {
      string: [],
      boolean: [],
      alias: {},
      default: {}
    };

    _.each(this._options, option => {
      if (option.type === Boolean) {
        minimistDef.boolean.push(option.name);
        if (!('default' in option) && !option.required) {
          minimistDef.default[option.name] = EMPTY;
        }
      } else {
        minimistDef.string.push(option.name);
      }

      if (option.alias) {
        minimistDef.alias[option.alias] = option.name;
      }

      // Only apply default values if we don't already have a value injected from
      // the runner
      if (option.name in this._initOptions) {
        minimistDef.default[option.name] = this._initOptions[option.name];
      } else if (option.alias && option.alias in this._initOptions) {
        minimistDef.default[option.name] = this._initOptions[option.alias];
      } else if ('default' in option) {
        minimistDef.default[option.name] = option.default;
      }
    });

    const parsedOpts = minimist(this._args, minimistDef);

    // Parse options to the desired type
    _.each(parsedOpts, (option, name) => {
      // Manually set value as undefined if it should be.
      if (option === EMPTY) {
        parsedOpts[name] = undefined;
        return;
      }

      if (this._options[name] && option !== undefined) {
        parsedOpts[name] = this._options[name].type(option);
      }
    });

    // Parse positional arguments to valid options
    this._arguments.forEach((config, index) => {
      let value;
      if (index >= parsedOpts._.length) {
        if (config.name in this._initOptions) {
          value = this._initOptions[config.name];
        } else if ('default' in config) {
          value = config.default;
        } else {
          return;
        }
      } else if (config.type === Array) {
        value = parsedOpts._.slice(index, parsedOpts._.length);
      } else {
        value = config.type(parsedOpts._[index]);
      }

      parsedOpts[config.name] = value;
    });

    // Make the parsed options available to the instance
    Object.assign(this.options, parsedOpts);
    this.args = parsedOpts._;
    this.arguments = parsedOpts._;

    // Make sure required args are all present
    this.checkRequiredArgs();
  }

  checkRequiredArgs() {
    // If the help option was provided, we don't want to check for required
    // arguments, since we're only going to print the help message anyway.
    if (this.options.help) {
      return;
    }

    // Bail early if it's not possible to have a missing required arg
    if (this.args.length > this._arguments.length) {
      return;
    }

    this._arguments.forEach((config, position) => {
      // If the help option was not provided, check whether the argument was
      // required, and whether a value was provided.
      if (config.required && position >= this.args.length) {
        return this.emit(
          'error',
          new Error(`Did not provide required argument ${chalk.bold(config.name)}!`)
        );
      }
    });
  }

  /**
   * Schedule methods on a run queue.
   *
   * @param {Function|Object} method: Method to be scheduled or object with function properties.
   * @param {String} [methodName]: Name of the method (task) to be scheduled.
   * @param {String} [queueName]: Name of the queue to be scheduled on.
   * @param {Function} [reject]: Reject callback.
   */
  queueMethod(method, methodName, queueName, reject) {
    if (typeof queueName === 'function') {
      reject = queueName;
      queueName = 'default';
    } else {
      queueName = queueName || 'default';
    }

    if (!_.isFunction(method)) {
      if (typeof methodName === 'function') {
        reject = methodName;
        methodName = undefined;
      }

      this.queueTaskGroup(method, {
        queueName: methodName,
        reject
      });
      return;
    }

    this.queueTask({
      method,
      taskName: methodName,
      queueName,
      reject
    });
  }

  /**
   * Schedule methods on a run queue.
   *
   * @param {Object}          taskGroup: Object containing tasks.
   * @param {TaskOptions} [taskOptions]: options.
   */
  queueTaskGroup(taskGroup, taskOptions) {
    const self = this;
    // Run each queue items
    _.each(taskGroup, (newMethod, newMethodName) => {
      if (!_.isFunction(newMethod) || !methodIsValid(newMethodName)) return;

      self.queueTask({
        ...taskOptions,
        method: newMethod,
        taskName: newMethodName
      });
    });
  }

  /**
   * @private
   * Schedule a generator's method on a run queue.
   *
   * @param {String}  name: The method name to schedule.
   * @param {TaskOptions} [taskOptions]: options.
   */
  queueOwnTask(name, taskOptions = {}) {
    const property = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(this), name);
    const item = property.value ? property.value : property.get.call(this);

    const priority = this._queues[name];
    taskOptions = {
      ...priority,
      cancellable: true,
      run: false,
      ...taskOptions
    };

    // Name points to a function; run it!
    if (typeof item === 'function') {
      taskOptions.taskName = name;
      taskOptions.method = item;
      this.queueTask(taskOptions);
      return;
    }

    // Not a queue hash; stop
    if (!priority) {
      return;
    }

    this.queueTaskGroup(item, taskOptions);
  }

  /**
   * @private
   * Schedule every generator's methods on a run queue.
   *
   * @param {TaskOptions} [taskOptions]: options.
   */
  queueOwnTasks(taskOptions) {
    this._running = true;
    this._taskStatus = { cancelled: false, timestamp: new Date() };

    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(this));
    const validMethods = methods.filter(methodIsValid);
    if (validMethods.length === 0 && this._prompts.length === 0) {
      const error = new Error(
        'This Generator is empty. Add at least one method for it to run.'
      );
      this.emit('error', error);
      throw error;
    }

    if (this._prompts.length > 0) {
      this.queueTask({
        method: () => this.prompt(this._prompts, this.config),
        taskName: 'Prompt registered questions',
        queueName: 'prompting',
        cancellable: true
      });

      if (validMethods.length === 0) {
        this.queueTask({
          method: () => {
            this.renderTemplate();
          },
          taskName: 'Empty generator: copy templates',
          queueName: 'writing',
          cancellable: true
        });
      }
    }

    validMethods.forEach(methodName => this.queueOwnTask(methodName, taskOptions));
  }

  /**
   * Schedule tasks on a run queue.
   *
   * @param {Task} task: Task to be queued.
   */
  queueTask(task) {
    const {
      generatorReject,
      reject,
      queueName = 'default',
      taskName: methodName,
      method
    } = task;
    const once = task.once ? methodName : undefined;

    const priority = Object.entries(this._queues).find(
      ([_, opts]) => opts.queueName === queueName
    );
    const priorityName = priority ? priority[0] : undefined;

    const self = this;
    const runLoop = this.env.runLoop;
    let namespace = '';
    if (self.options && self.options.namespace) {
      namespace = self.options.namespace;
    }

    // Task status allows to ignore (cancel) current queued tasks.
    // Each queueOwnTasks (complete run) create a new taskStatus.
    const taskStatus = this._taskStatus || {};

    debug(
      `Queueing ${namespace}#${methodName} with options %o`,
      _.omit(task, ['method'])
    );
    runLoop.add(
      queueName,
      // Run-queue's done(continue), pause
      continueQueue => {
        debug(`Running ${namespace}#${methodName}`);
        self.emit(`method:${methodName}`);
        const taskCancelled = task.cancellable && taskStatus.cancelled;
        if (taskCancelled) {
          continueQueue();
          return;
        }

        runAsync(function() {
          self.async = () => this.async();
          self.runningState = { namespace, queueName, methodName };
          return method.apply(self, self.args);
        })()
          .then(function() {
            delete self.runningState;
            const eventName = `done$${namespace || 'unknownnamespace'}#${methodName}`;
            debug(`Emiting event ${eventName}`);
            self.env.emit(eventName, {
              namespace,
              generator: self,
              queueName,
              priorityName
            });
            continueQueue();
          })
          .catch(err => {
            debug(`An error occured while running ${namespace}#${methodName}`, err);
            if (reject) {
              debug('Rejecting task promise, queue will continue normally');
              reject(err);
              continueQueue();
              return;
            }

            delete self.runningState;
            // Ensure we emit the error event outside the promise context so it won't be
            // swallowed when there's no listeners.
            setImmediate(() => {
              if (generatorReject) {
                generatorReject(err);
              }

              self.emit('error', err);
            });
          });
      },
      { once, run: task.run }
    );
  }

  /**
   * Ignore cancellable tasks.
   */
  cancelCancellableTasks() {
    this._running = false;
    // Task status references is registered at each running task
    this._taskStatus.cancelled = true;
    // Create a new task status.
    delete this._taskStatus;
  }

  /**
   * Start the generator again.
   *
   * @param {Object} [options]: options.
   */
  startOver(options = {}) {
    this.cancelCancellableTasks();
    Object.assign(this.options, options);
    this.queueOwnTasks();
  }

  /**
   * Runs the generator, scheduling prototype methods on a run queue. Method names
   * will determine the order each method is run. Methods without special names
   * will run in the default queue.
   *
   * Any method named `constructor` and any methods prefixed by a `_` won't be scheduled.
   *
   * @param {Function} [cb] Deprecated: prefer to use the promise interface
   * @return {Promise} Resolved once the process finish
   */
  run(cb) {
    const promise = this.runWithOptions({ withOptions: false });

    // Maintain backward compatibility with the callback function
    if (_.isFunction(cb)) {
      return promise.then(cb, cb);
    }

    return promise;
  }

  /**
   * Alternative implementation of run() with a different api.
   * Api for run is stable for old generators.
   *
   * Runs the generator, scheduling prototype methods on a run queue. Method names
   * will determine the order each method is run. Methods without special names
   * will run in the default queue.
   *
   * Any method named `constructor` and any methods prefixed by a `_` won't be scheduled.
   *
   * @private
   * @param {Object} [options] Options.
   * @param {Boolean} [options.forwardErrorToEnvironment=true] Handle errors and forward the error on environment.
   * @param {Boolean} [options.usePromise=true] Register an error handler to reject the returned promise.
   * @return {Promise} Resolved once the queue is cleared.
   */
  runWithOptions(options = { withOptions: true }) {
    // Precedence is the arg, then this.options
    let {
      forwardErrorToEnvironment = this.options.forwardErrorToEnvironment,
      usePromise = this.options.usePromise
    } = options;

    if (usePromise === undefined && forwardErrorToEnvironment !== undefined) {
      // Options usePromise is recommended for forwardErrorToEnvironment
      usePromise = forwardErrorToEnvironment;
    } else if (usePromise === undefined) {
      // Use default config for the method run or runWithOptions.
      usePromise = options.withOptions;
    }

    const promise = new Promise((resolve, reject) => {
      this.debug('Generator is starting');
      this.emit('run');

      /*
       * Adding a error listener breaks workaround that throws an error on a scheduled callback.
       * Since there is no error handler on the callback, the error will be treated by node.js
       * and the process will be terminated.
       */
      if (usePromise) {
        // Add an error listener to reject the promise
        this.on('error', reject);
      }

      this.env.runLoop.once('end', () => {
        this.debug('Generator has ended');
        this.emit('end');
        resolve();
      });

      this.queueOwnTasks({
        generatorReject: usePromise ? undefined : reject
      });

      this.queueBasicTasks();

      this._composedWith.forEach(runGenerator);
      this._composedWith = [];
    });

    // For composed generators, otherwise error will not be catched.
    if (forwardErrorToEnvironment) {
      return promise.catch(err => {
        this.env.emit('error', err);
      });
    }

    return promise;
  }

  /**
   * Queue generator's basic tasks, only once execution is required for each environment.
   */
  queueBasicTasks() {
    const writeFiles = () => {
      this.env.runLoop.add('conflicts', this._writeFiles.bind(this), {
        once: 'write memory fs to disk'
      });
    };

    this.env.sharedFs.on('change', writeFiles);
    writeFiles();

    // Add the default conflicts handling
    this.env.runLoop.add('conflicts', done => {
      this.conflicter.resolve(err => {
        if (err) {
          return this.emit('error', err);
        }

        done();
      });
    });
  }

  /**
   * Compose this generator with another one.
   * @param  {String|Object|Array} generator  The path to the generator module or an object (see examples)
   * @param  {Object}  [options]   The options passed to the Generator
   * @param  {boolean} [returnNewGenerator] Returns the created generator instead of returning this.
   * @return {this|Object}    This generator or the composed generator when returnNewGenerator=true
   *
   * @example <caption>Using a peerDependency generator</caption>
   * this.composeWith('bootstrap', { sass: true });
   *
   * @example <caption>Using a direct dependency generator</caption>
   * this.composeWith(require.resolve('generator-bootstrap/app/main.js'), { sass: true });
   *
   * @example <caption>Passing a Generator class</caption>
   * this.composeWith({ Generator: MyGenerator, path: '../generator-bootstrap/app/main.js' }, { sass: true });
   */
  composeWith(generator, options, returnNewGenerator = false) {
    if (typeof options === 'boolean') {
      returnNewGenerator = options;
      options = {};
    }

    const returnCompose = ret => (returnNewGenerator ? ret : this);

    let instantiatedGenerator;

    if (Array.isArray(generator)) {
      const generators = generator.map(gen =>
        this.composeWith(gen, options, returnNewGenerator)
      );
      return returnCompose(generators);
    }

    const instantiate = (Generator, path) => {
      if (path === 'unknown') {
        Generator.resolved = path;
      } else {
        Generator.resolved = require.resolve(path);
      }

      Generator.namespace = this.env.namespace(path);

      return this.env.instantiate(Generator, {
        options,
        arguments: options.arguments
      });
    };

    options = options || {};

    // Pass down the default options so they're correctly mirrored down the chain.
    options = _.extend(
      {
        skipInstall: this.options.skipInstall || this.options['skip-install'],
        'skip-install': this.options.skipInstall || this.options['skip-install'],
        skipCache: this.options.skipCache || this.options['skip-cache'],
        'skip-cache': this.options.skipCache || this.options['skip-cache'],
        forceInstall: this.options.forceInstall || this.options['force-install'],
        'force-install': this.options.forceInstall || this.options['force-install'],
        skipLocalCache: this.options.skipLocalCache,
        destinationRoot: this._destinationRoot
      },
      options
    );

    if (typeof generator === 'string') {
      try {
        const GeneratorImport = require(generator); // eslint-disable-line import/no-dynamic-require
        const Generator =
          typeof GeneratorImport.default === 'function'
            ? GeneratorImport.default
            : GeneratorImport;

        instantiatedGenerator = instantiate(Generator, generator);
      } catch (err) {
        if (err.code === 'MODULE_NOT_FOUND') {
          instantiatedGenerator = this.env.create(generator, {
            options,
            arguments: options.arguments
          });
        } else {
          throw err;
        }
      }
    } else {
      assert(
        generator.Generator,
        `${chalk.red('Missing Generator property')}\n` +
          `When passing an object to Generator${chalk.cyan(
            '#composeWith'
          )} include the generator class to run in the ${chalk.cyan(
            'Generator'
          )} property\n\n` +
          `this.composeWith({\n` +
          `  ${chalk.yellow('Generator')}: MyGenerator,\n` +
          `  ...\n` +
          `});`
      );
      assert(
        typeof generator.path === 'string',
        `${chalk.red('path property is not a string')}\n` +
          `When passing an object to Generator${chalk.cyan(
            '#composeWith'
          )} include the path to the generators files in the ${chalk.cyan(
            'path'
          )} property\n\n` +
          `this.composeWith({\n` +
          `  ${chalk.yellow('path')}: '../my-generator',\n` +
          `  ...\n` +
          `});`
      );
      instantiatedGenerator = instantiate(generator.Generator, generator.path);
    }

    if (!instantiatedGenerator) {
      return returnCompose(instantiatedGenerator);
    }

    if (this._running) {
      runGenerator(instantiatedGenerator);
    } else {
      this._composedWith.push(instantiatedGenerator);
    }

    return returnCompose(instantiatedGenerator);
  }

  /**
   * Determine the root generator name (the one who's extending Generator).
   * @return {String} The name of the root generator
   */
  rootGeneratorName() {
    const pkg = readPkgUp.sync({ cwd: this.resolved }).pkg;
    return pkg ? pkg.name : '*';
  }

  /**
   * Determine the root generator version (the one who's extending Generator).
   * @return {String} The version of the root generator
   */
  rootGeneratorVersion() {
    const pkg = readPkgUp.sync({ cwd: this.resolved }).pkg;
    return pkg ? pkg.version : '0.0.0';
  }

  /**
   * Return a storage instance.
   * @param  {String} storePath  The path of the json file
   * @param  {String} [path] The name in which is stored inside the json
   * @param  {String} [lodashPath] Treat path as an lodash path
   * @return {Storage} json storage
   */
  createStorage(storePath, path, lodashPath = false) {
    storePath = this.destinationPath(storePath);
    return new Storage(path, this.fs, storePath, lodashPath);
  }

  /**
   * Return a storage instance.
   * @param  {String} [rootName] The rootName in which is stored inside .yo-rc.json
   * @return {Storage} Generator storage
   * @private
   */
  _getStorage(rootName = this.rootGeneratorName()) {
    const storePath = path.join(this.destinationRoot(), '.yo-rc.json');
    return new Storage(rootName, this.fs, storePath);
  }

  /**
   * Setup a globalConfig storage instance.
   * @return {Storage} Global config storage
   * @private
   */
  _getGlobalStorage() {
    // When localConfigOnly === true simulate a globalConfig at local dir
    const globalStorageDir = this.options.localConfigOnly
      ? this.destinationRoot()
      : os.homedir();
    const storePath = path.join(globalStorageDir, '.yo-rc-global.json');
    const storeName = `${this.rootGeneratorName()}:${this.rootGeneratorVersion()}`;
    return new Storage(storeName, this.fs, storePath);
  }

  /**
   * Change the generator destination root directory.
   * This path is used to find storage, when using a file system helper method (like
   * `this.write` and `this.copy`)
   * @param  {String} rootPath new destination root path
   * @param  {Boolean} skipEnvironment - don't update the environment cwd/chdir.
   * @return {String}          destination root path
   */
  destinationRoot(rootPath, skipEnvironment = false) {
    if (typeof rootPath === 'string') {
      this._destinationRoot = path.resolve(rootPath);

      if (!fs.existsSync(this._destinationRoot)) {
        makeDir.sync(this._destinationRoot);
      }

      if (!skipEnvironment) {
        process.chdir(this._destinationRoot);
        this.env.cwd = this._destinationRoot;
      }

      // Reset the storage
      this.config = this._getStorage();
    }

    return this._destinationRoot || this.env.cwd;
  }

  /**
   * Change the generator source root directory.
   * This path is used by multiples file system methods like (`this.read` and `this.copy`)
   * @param  {String} rootPath new source root path
   * @return {String}          source root path
   */
  sourceRoot(rootPath) {
    if (typeof rootPath === 'string') {
      this._sourceRoot = path.resolve(rootPath);
    }

    return this._sourceRoot;
  }

  /**
   * Join a path to the source root.
   * @param  {...String} dest - path parts
   * @return {String}    joined path
   */
  templatePath(...dest) {
    let filepath = path.join.apply(path, dest);

    if (!path.isAbsolute(filepath)) {
      filepath = path.join(this.sourceRoot(), filepath);
    }

    return filepath;
  }

  /**
   * Join a path to the destination root.
   * @param  {...String} dest - path parts
   * @return {String}    joined path
   */
  destinationPath(...dest) {
    let filepath = path.join.apply(path, dest);

    if (!path.isAbsolute(filepath)) {
      filepath = path.join(this.destinationRoot(), filepath);
    }

    return filepath;
  }

  /**
   * Determines the name of the application.
   *
   * First checks for name in bower.json.
   * Then checks for name in package.json.
   * Finally defaults to the name of the current directory.
   * @return {String} The name of the application
   */
  determineAppname() {
    let appname = this.fs.readJSON(this.destinationPath('bower.json'), {}).name;

    if (!appname) {
      appname = this.fs.readJSON(this.destinationPath('package.json'), {}).name;
    }

    if (!appname) {
      appname = path.basename(this.destinationRoot());
    }

    return appname.replace(/[^\w\s]+?/g, ' ');
  }

  /**
   * Add a transform stream to the commit stream.
   *
   * Most usually, these transform stream will be Gulp plugins.
   *
   * @param  {stream.Transform|stream.Transform[]} streams An array of Transform stream
   * or a single one.
   * @return {this} This generator
   */
  registerTransformStream(streams) {
    assert(streams, 'expected to receive a transform stream as parameter');
    if (!Array.isArray(streams)) {
      streams = [streams];
    }

    this._transformStreams = this._transformStreams.concat(streams);
    return this;
  }

  /**
   * Write memory fs file to disk and logging results
   * @param {Function} done - callback once files are written
   * @private
   */
  _writeFiles(done) {
    const self = this;

    const conflictChecker = through.obj(function(file, enc, cb) {
      const stream = this;

      // If the file has no state requiring action, move on
      if (file.state === null) {
        return cb();
      }

      // Config file should not be processed by the conflicter. Just pass through
      const filename = path.basename(file.path);

      if (filename === '.yo-rc.json' || filename === '.yo-rc-global.json') {
        file.conflicter = 'force';
      }

      self.conflicter.checkForCollision(file, (err, status) => {
        if (err) {
          cb(err);
          return;
        }

        if (status === 'skip') {
          delete file.state;
        } else {
          stream.push(file);
        }

        cb();
      });
      self.conflicter.resolve();
    });

    const transformStreams = this._transformStreams.concat([conflictChecker]);
    this.fs.commit(transformStreams, () => {
      done();
    });
  }
}

// Mixin the actions modules
_.extend(Generator.prototype, require('./actions/install'));
_.extend(Generator.prototype, require('./actions/help'));
_.extend(Generator.prototype, require('./actions/spawn-command'));
_.extend(Generator.prototype, require('./actions/fs'));
Generator.prototype.user = require('./actions/user');

module.exports = Generator;
