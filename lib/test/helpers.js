var fs = require('fs');
var path = require('path');
var rimraf = require('rimraf');
var mkdirp = require('mkdirp');
var assert = require('assert');
var generators = require('../..');


// Mocha helpers
var helpers = module.exports;

// cleanup the test dir, and cd into it
helpers.before = function before(dir) {
  if (!dir) {
    throw new Error('Missing directory');
  }

  dir = path.resolve(dir);

  return function (done) {
    rimraf(dir, function (err) {
      if (err) {
        return done(err);
      }
      mkdirp.sync(dir);
      process.chdir(dir);
      helpers.gruntfile({ dummy: true }, done);
    });
  };
};

// Generates a new Gruntfile.js in the current working directory based on
// `options` hash passed in. Same as other helpers, meant to be use as a mocha
// handler.
//
// - options  - Grunt configuration
// - done     - callback to call on completion
//
// Example
//
//    before(helpers.gruntfile({
//      foo: {
//        bar: '<config.baz>'
//      }
//    }));
//
// Returns a function suitable to use with mocha hooks.
helpers.gruntfile = function (options, done) {
  var config = 'grunt.initConfig(' + JSON.stringify(options, null, 2) + ');';
  config = config.split('\n').map(function (line) {
    return '  ' + line;
  }).join('\n');

  var out = [
    'module.exports = function(grunt) {',
    config,
    '};'
  ];

  fs.writeFile('Gruntfile.js', out.join('\n'), done);
};

helpers.assertFile = function (file, reg) {
  var here = fs.existsSync(file);
  assert.ok(here, file + ', no such file or directory');

  if (!reg) {
    return assert.ok(here);
  }

  var body = fs.readFileSync(file, 'utf8');
  assert.ok(reg.test(body));
};

// Temporary mocking prompt
helpers.mockPrompt = function (fn, cb) {
  var prompt = require('prompt');
  var _getInput = prompt.getInput;

  prompt.getInput = function (option, done) {
    console.log(option.message);
    setTimeout(function () {
      done(null, option.default)
    }, 200);
  };

  fn(function (err) {
    prompt.getInput = _getInput;
    cb(err);
  });
};

// Used to run a given generator from provided `args`, with the given set of
// `options, calling back the `done` handler on completion.
//
// - args   - String of remaining arguments, or Array of arguments (equivalent
//            of grunt.cli.tasks)
// - opts   - Optional set of options (equivalent of grunt.cli.options)
// - done   - Function triggered on completion
//
//  Example:
//
//      helpers.runGenerator('angular:app appname', done);
//
//      helpers.runGenerator('angular:controller MyController', {
//        views: true
//      }, done);
//
// Return the generator instance, when resolved.
helpers.runGenerator = function (args, opts, done) {
  args = Array.isArray(args) ? args : args.split(' ');

  if (!done) {
    done = opts;
    opts = {};
  }

  // always "force" to avoid the file collision menu.
  opts.force = true;

  var generator = generators.init(grunt, args, opts);

  if (!generator) {
    return done();
  }

  generator.on('end', done);

  return generator;
};
