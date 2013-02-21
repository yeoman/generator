var fs = require('fs');
var path = require('path');
var rimraf = require('rimraf');
var mkdirp = require('mkdirp');
var util = require('util');
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

// Check all files present in the array are existing.
// If the item is an array first item is the file path, 2nd a regexp
// to check file content with
//
// helpers.assertFiles(['foo.js', 'bar.js', ['baz.js', /function baz/]]);
//
helpers.assertFiles = function(files) {
  files.forEach(function(item) {
    var file = item;
    var rx;
    if (item instanceof Array) {
      file = item[0];
      rx = item[1];
    };

    helpers.assertFile(file, rx);
  });
}

// Clean-up the test directory and ce into it.
// Call given callback when you're there.
//
helpers.testDirectory = function(dir, cb) {
  if (!dir) {
    throw new Error('Missing directory');
  }

  dir = path.resolve(dir);

  rimraf(dir, function (err) {
    if (err) {
      return cb(err);
    }
    mkdirp.sync(dir);
    process.chdir(dir);
    cb();
  });
};

// Will answer to the questions for the furnished generator
//
// Example:
//  mockPrompt(angular, {'bootstrap': 'Y', 'compassBoostrap': 'Y'});
//
helpers.mockPrompt = function( generator, answers) {
    var origPrompt = generator.prompt;
    generator.prompt = function(prompts, done) {
      done(null, answers);
    };
    generator.origPrompt = origPrompt;
}

//
// Create a simple, dummy generator
//
helpers.createDummyGenerator = function() {
  var dummy = function Dummy() {
    generators.Base.apply(this, arguments);
  };

  util.inherits(dummy, generators.Base);

  dummy.prototype.test = function () {
    this.shouldRun = true;
  };

  return dummy;
}

// Create a generator, using the given dependencies and controller arguments
// Dependecies can be path (autodiscovery) or an array [<generator>, <name>]
//
// Example:
//  var deps = ['../../app',
//              '../../common',
//              '../../controller',
//              '../../main',
//              [createDummyGenerator(), 'testacular:app']
//             ];
// var angular = createGenerator('angular:app', deps);
//
helpers.createGenerator = function ( name, dependencies, args) {
  var env = generators();
  dependencies.forEach(function(d) {
    if (d instanceof Array) {
      env.register(d[0], d[1]);
    } else {
     env.register(d);
    }
  });

  var generator = env.create(name, {arguments: args});

  generator.on('start', env.emit.bind(this, 'generators:start'));
  generator.on('start', env.emit.bind(this, name + ':start'));

  generator.on('method', function (method) {
    env.emit(name + ':' + method);
  });

  generator.on('end', env.emit.bind(this, name + ':end'));
  generator.on('end', env.emit.bind(this, 'generators:end'));

  return generator;
};



