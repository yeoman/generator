'use strict';
var fs = require('fs');
var path = require('path');
var rimraf = require('rimraf');
var mkdirp = require('mkdirp');
var util = require('util');
var assert = require('assert');
var _ = require('lodash');
var generators = require('../..');

// Mocha helpers
var helpers = module.exports;

helpers.decorated = [];

/**
 * Create a function that will clean up the test directory,
 * cd into it, and create a dummy gruntfile inside. Intended for use
 * as a callback for the mocha `before` hook.
 *
 * @param {String} dir - path to the test directory
 * @returns {Function} mocha callback
 */

helpers.setUpTestDirectory = function before(dir) {
  return function (done) {
    helpers.testDirectory(dir, function () {
      helpers.gruntfile({ dummy: true }, done);
    });
  };
};

/**
 * Create a function that will clean up the test directory,
 * cd into it, and create a dummy gruntfile inside. Intended for use
 * as a callback for the mocha `before` hook.
 *
 * @deprecated
 * @param {String} dir - path to the test directory
 * @returns {Function} mocha callback
 */

helpers.before = function (dir) {
  console.log('before is deprecated. Use setUpTestDirectory instead');
  return helpers.setUpTestDirectory(dir);
};

/**
 * Wrap a method with custom functionality.
 *
 * @param {Object} context - context to find the original method
 * @param {String} method  - name of the method to wrap
 * @param {Function} replacement - executes before the original method
 * @param {Object} options - config settings
 */

helpers.decorate = function decorate(context, method, replacement, options) {
  options = options || {};
  replacement = replacement || function () {};

  var naturalMethod = context[method];

  helpers.decorated.push({
    context: context,
    method: method,
    naturalMethod: naturalMethod
  });

  context[method] = function () {
    var rep = replacement.apply(context, arguments);

    if (!options.stub) {
      naturalMethod.apply(context, arguments);
    }

    return rep;
  };
};

/**
 * Override a method with custom functionality.
 * @param {Object} context - context to find the original method
 * @param {String} method  - name of the method to wrap
 * @param {Function} replacement - executes before the original method
 */
helpers.stub = function stub(context, method, replacement) {
  helpers.decorate(context, method, replacement, { stub: true });
};

/**
 * Restore the original behavior of all decorated and stubbed methods
 */
helpers.restore = function restore() {
  helpers.decorated.forEach(function (dec) {
    dec.context[dec.method] = dec.naturalMethod;
  });
};

/**
 *
 * Generates a new Gruntfile.js in the current working directory based on
 * options hash passed in.
 *
 * @param {Object} options - Grunt configuration
 * @param {Function} done  - callback to call on completion
 * @example
 * before(helpers.gruntfile({
 *   foo: {
 *     bar: '<config.baz>'
 *   }
 * }));
 *
 */

helpers.gruntfile = function (options, done) {
  var config = 'grunt.initConfig(' + JSON.stringify(options, null, 2) + ');';
  config = config.split('\n').map(function (line) {
    return '  ' + line;
  }).join('\n');

  var out = [
    'module.exports = function (grunt) {',
    config,
    '};'
  ];

  fs.writeFile('Gruntfile.js', out.join('\n'), done);
};

/**
 * Assert that a file exists
 * @param  {String}       file     - path to a file
 * @example
 * assertFile('templates/user.hbs');
 *
 * @also
 *
 * Assert that each of an array of files exists
 * @param {Array}         pairs    - an array of paths to files
 * @example
 * assertFile(['templates/user.hbs', 'templates/user/edit.hbs']);
 *
 * @also
 *
 * Assert that a file's content matches a regex
 * @deprecated
 * @param  {String}       file     - path to a file
 * @param  {Regex}        reg      - regex that will be used to search the file
 * @example
 * assertFileContent('models/user.js', /App\.User = DS\.Model\.extend/);
 */

helpers.assertFile = function () {
  var args = _.toArray(arguments);
  if (_.last(args) instanceof RegExp) {  // DEPRECATED CASE
    var depMsg = 'assertFile(String, RegExp) DEPRECATED; use ';
    depMsg += 'assertFileContent(String, RegExp) instead.';
    console.log(depMsg);
    helpers.assertFileContent(args[0], args[1]);
  } else {
    args = _.isString(args[0]) ? args : args[0];
    args.forEach(function (file) {
      var here = fs.existsSync(file);
      assert.ok(here, file + ', no such file or directory');
    });
  }
};

/**
 * Assert that a file doesn't exist
 * @param  {String}       file     - path to a file
 * @example
 * assertNoFile('templates/user.hbs');
 *
 * @also
 *
 * Assert that each of an array of files doesn't exist
 * @param {Array}         pairs    - an array of paths to files
 * @example
 * assertNoFile(['templates/user.hbs', 'templates/user/edit.hbs']);
 */

helpers.assertNoFile = function () {
  var args = _.toArray(arguments);
  args = _.isString(args[0]) ? args : args[0];
  args.forEach(function (file) {
    var here = fs.existsSync(file);
    assert.ok(!here, file + ' exists');
  });
};

/**
 * Assert that each of an array of files exists. If an item is an array with
 * the first element a filepath and the second element a regex, check to see
 * that the file content matches the regex
 * @deprecated
 * @param {Array} pairs - an array of paths to files or file/regex subarrays
 * @example
 * assertFile(['templates/user.hbs', 'templates/user/edit.hbs']);
 * @example
 * assertFiles(['foo.js', 'bar.js', ['baz.js', /function baz/]]);
 */

helpers.assertFiles = function (files) {
  var depMsg = 'assertFiles deprecated. Use ';
  depMsg += 'assertFile([String, String, ...]) or ';
  depMsg += 'assertFile([[String, RegExp], [String, RegExp]...]) instead.';
  console.log(depMsg);
  files.forEach(function (item) {
    var file = item;
    var rx;
    if (item instanceof Array) {
      file = item[0];
      rx = item[1];
      helpers.assertFileContent(file, rx);
    } else {
      helpers.assertFile(file);
    }
  });
};

/**
 * Assert that a file's content matches a regex
 * @param  {String}       file     - path to a file
 * @param  {Regex}        reg      - regex that will be used to search the file
 * @example
 * assertFileContent('models/user.js', /App\.User = DS\.Model\.extend/);
 *
 * @also
 *
 * Assert that each file in an array of file-regex pairs matches its corresponding regex
 * @param {Array}         pairs    - an array of arrays, where each subarray is a [String, RegExp] pair
 * @example
 * var arg = [
 *   [ 'models/user.js', /App\.User \ DS\.Model\.extend/ ],
 *   [ 'controllers/user.js', /App\.UserController = Ember\.ObjectController\.extend/ ]
 * ]
 * assertFileContent(arg);
 */

helpers.assertFileContent = function () {
  var args = _.toArray(arguments);
  var pairs = _.isString(args[0]) ? [args] : args[0];
  pairs.forEach(function (pair) {
    var file = pair[0];
    var regex = pair[1];
    helpers.assertFile(file);
    var body = fs.readFileSync(file, 'utf8');
    assert.ok(regex.test(body), file + ' did not match \'' + regex + '\'.');
  });
};

/**
 * Assert that a file's content does not match a regex
 * @param  {String}       file     - path to a file
 * @param  {Regex}        reg      - regex that will be used to search the file
 * @example
 * assertNoFileContent('models/user.js', /App\.User = DS\.Model\.extend/);
 *
 * @also
 *
 * Assert that each file in an array of file-regex pairs does not match its corresponding regex
 * @param {Array}         pairs    - an array of arrays, where each subarray is a [String, RegExp] pair
 * var arg = [
 *   [ 'models/user.js', /App\.User \ DS\.Model\.extend/ ],
 *   [ 'controllers/user.js', /App\.UserController = Ember\.ObjectController\.extend/ ]
 * ]
 * assertNoFileContent(arg);
 */

helpers.assertNoFileContent = function (file, reg) {
  var args = _.toArray(arguments);
  var pairs = _.isString(args[0]) ? [args] : args[0];
  pairs.forEach(function (pair) {
    var file = pair[0];
    var regex = pair[1];
    helpers.assertFile(file);
    var body = fs.readFileSync(file, 'utf8');
    assert.ok(!regex.test(body), file + ' did not match \'' + regex + '\'.');
  });
};

/**
 * Assert that two strings are equal after standardization of newlines
 * @param {String} value - a string
 * @param {String} expected - the expected value of the string
 * @example
 * assertTextEqual('I have a yellow cat', 'I have a yellow cat');
 */

helpers.assertTextEqual = function (value, expected) {
  function eol(str) {
    return str.replace(/\r\n/g, '\n');
  }

  assert.equal(eol(value), eol(expected));
};

/**
 * Assert an Object implements an interface
 * @param  {Object}       obj     - subject implementing the façade
 * @param  {Object|Array} methods - a façace, hash or array of keys to be implemented
 */

helpers.assertImplement = function (obj, methods) {
  methods = _.isArray(methods) ? methods : Object.keys(methods);
  var pass = methods.reduce(function (rest, method) {
    if (obj[method] != null) return true;
    return rest;
  }, false);

  assert.ok(pass);
};

/**
 * Clean-up the test directory and cd into it.
 * Call given callback after entering the test directory.
 * @param {String} dir - path to the test directory
 * @param {Function} cb - callback executed after setting working directory to dir
 * @example
 * testDirectory(path.join(__dirname, './temp'), function () {
 *   fs.writeFileSync('testfile', 'Roses are red.');
 * );
 */

helpers.testDirectory = function (dir, cb) {
  if (!dir) {
    throw new Error('Missing directory');
  }

  dir = path.resolve(dir);

  // Make sure we're not deleting CWD by moving to top level folder. As we `cd` in the
  // test dir after cleaning up, this shouldn't be perceivable.
  process.chdir('/');

  rimraf(dir, function (err) {
    if (err) {
      return cb(err);
    }
    mkdirp.sync(dir);
    process.chdir(dir);
    cb();
  });
};

/**
 * Answer prompt questions for the passed-in generator
 * @param {Generator} generator - a Yeoman generator
 * @param {Object} answers - an object where keys are the
 *   generators prompt names and values are the answers to
 *   the prompt questions
 * @example
 * mockPrompt(angular, {'bootstrap': 'Y', 'compassBoostrap': 'Y'});
 */

helpers.mockPrompt = function (generator, answers) {
  var origPrompt = generator.prompt;
  generator.prompt = function (prompts, done) {
    done(answers);
  };
  generator.origPrompt = origPrompt;
};

/**
 * Create a simple, dummy generator
 */

helpers.createDummyGenerator = function () {
  return generators.Base.extend({
    test: function () {
      this.shouldRun = true;
    }
  });
};

/**
 * Create a generator, using the given dependencies and controller arguments
 * Dependecies can be path (autodiscovery) or an array [<generator>, <name>]
 *
 * @param {String} name - the name of the generator
 * @param {Array} dependencies - paths to the generators dependencies
 * @param {Array|String} args - arguments to the generator;
 *   if String, will be split on spaces to create an Array
 * @param {Object} options - configuration for the generator
 * @example
 *  var deps = ['../../app',
 *              '../../common',
 *              '../../controller',
 *              '../../main',
 *              [createDummyGenerator(), 'testacular:app']
 *            ];
 * var angular = createGenerator('angular:app', deps);
 */

helpers.createGenerator = function (name, dependencies, args, options) {
  var env = generators();
  dependencies.forEach(function (d) {
    if (d instanceof Array) {
      env.registerStub(d[0], d[1]);
    } else {
      env.register(d);
    }
  });

  var generator = env.create(name, { arguments: args, options: options });

  generator.on('start', env.emit.bind(this, 'generators:start'));
  generator.on('start', env.emit.bind(this, name + ':start'));

  generator.on('method', function (method) {
    env.emit(name + ':' + method);
  });

  generator.on('end', env.emit.bind(this, name + ':end'));
  generator.on('end', env.emit.bind(this, 'generators:end'));

  return generator;
};
