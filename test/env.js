/*global it, describe, before, beforeEach */
var fs = require('fs');
var path = require('path');
var util = require('util');
var assert = require('assert');
var sinon = require('sinon');
var generators = require('..');
var helpers = generators.test;
var events = require('events');

var Base = generators.Base;
var Environment = require('../lib/env');

describe('Environment', function () {

  beforeEach(function () {
    this.env = new Environment();
    process.chdir(__dirname);
  });

  afterEach(function () {
    this.env.removeAllListeners();
  });

  it('is an instance of EventEmitter', function () {
    assert.ok(new Environment() instanceof events.EventEmitter);
  });

  describe('constructor', function () {
    it('take arguments option', function () {
      var args = ['foo'];
      assert.equal(new Environment(args).arguments, args);
    });

    it('take arguments parameter option as string', function () {
      var args = 'foo bar';
      assert.deepEqual(new Environment(args).arguments, args.split(' '));
    });

    it('take options parameter', function () {
      var opts = { foo : 'bar' };
      assert.equal(new Environment(null, opts).options, opts);
    });
  });

  describe('#help', function () {
    beforeEach(function () {
      this.env
        .register('./fixtures/custom-generator-simple')
        .register('./fixtures/custom-generator-extend');

      this.expected = fs.readFileSync(path.join(__dirname, 'fixtures/help.txt'), 'utf8').trim();

      // lazy "update the help fixtures because something changed" statement
      // fs.writeFileSync(path.join(__dirname, 'fixtures/help.txt'), env.help().trim());
    });

    it('output the general help', function () {
      helpers.assertTextEqual(this.env.help().trim(), this.expected);
    });

    it('output the help with a custom bin name', function () {
      this.expected = this.expected.replace('Usage: init', 'Usage: gg');
      helpers.assertTextEqual(this.env.help('gg').trim(), this.expected);
    });
  });

  describe('#create', function () {
    beforeEach(function () {
      this.Generator = helpers.createDummyGenerator();
      this.env.registerStub(this.Generator, 'stub');
      this.env.registerStub(this.Generator, 'stub:foo:bar');
    });

    it('instantiate a generator', function () {
      assert.ok(this.env.create('stub') instanceof this.Generator);
    });

    it('pass options.arguments', function () {
      var args = ['foo', 'bar'];
      var generator = this.env.create('stub', { arguments: args });
      assert.equal(generator.arguments, args);
    });

    it('pass options.arguments as string', function () {
      var args = 'foo bar';
      var generator = this.env.create('stub', { arguments: args });
      assert.deepEqual(generator.arguments, args.split(' '));
    });

    it('pass options.args (as `arguments` alias)', function () {
      var args = ['foo', 'bar'];
      var generator = this.env.create('stub', { args: args });
      assert.equal(generator.arguments, args);
    });

    it('prefer options.arguments over options.args', function () {
      var arguments = ['yo', 'unicorn'];
      var args = ['foo', 'bar'];
      var generator = this.env.create('stub', { arguments: arguments, args: args });
      assert.equal(generator.arguments, arguments);
      assert.notEqual(generator.arguments, args);
    });

    it('default arguments to `env.arguments`', function () {
      var args = ['foo', 'bar'];
      this.env.arguments = args;
      var generator = this.env.create('stub');
      assert.notEqual(generator.arguments, args, 'not passed by reference');
      assert.deepEqual(generator.arguments, args);
    });

    it('pass options.options', function () {
      var opts = { 'foo' : 'bar' };
      var generator = this.env.create('stub', { options: opts });
      assert.equal(generator.options, opts);
    });

    it('default options to `env.options` content', function () {
      this.env.options = { 'foo' : 'bar' };
      assert.equal(this.env.create('stub').options.foo, 'bar');
    });

    it('throws if Generator is not registered', function () {
      assert.throws(this.env.create.bind(this.end, 'i:do:not:exist'));
    });

    it('add a name property on the options', function () {
      assert.equal(this.env.create('stub').options.name, 'stub');
      assert.equal(this.env.create('stub:foo:bar').options.name, 'bar');
    });

    it('add the env as property on the options', function () {
      assert.equal(this.env.create('stub').options.env, this.env);
    });

    it('add the Generator resolved path on the options', function() {
      assert.equal(this.env.create('stub').options.resolved, this.env.get('stub').resolved);
    });
  });

  describe('#run', function () {
    beforeEach(function () {
      var self = this;
      this.stub = function () {
        self.args = arguments;
        Base.apply(this, arguments);
      };
      this.runMethod = sinon.spy(Base.prototype, 'run');
      util.inherits(this.stub, Base);
      this.env.registerStub(this.stub, 'stub:run');
    });

    afterEach(function() {
      this.runMethod.restore();
    });

    it('runs a registered generator', function (done) {
      this.env.run(['stub:run'], function() {
        assert.ok(this.runMethod.calledOnce);
        done();
      }.bind(this));
    });

    it('pass args and options to the runned generator', function (done) {
      var args = ['stub:run', 'module'];
      var options = {};
      this.env.run(args, options, function () {
        assert.ok(this.runMethod.calledOnce);
        assert.equal(this.args[0], 'module');
        assert.equal(this.args[1], options);
        done();
      }.bind(this));
    });

    it('without options, it default to env.options', function (done) {
      var args = ['stub:run', 'foo'];
      this.env.options = { some: 'stuff' };
      this.env.run(args, function () {
        assert.ok(this.runMethod.calledOnce);
        assert.equal(this.args[0], 'foo');
        assert.equal(this.args[1], this.env.options);
        done();
      }.bind(this));
    });

    it('without args, it default to env.arguments', function (done) {
      this.env.arguments = ['stub:run', 'my-args'];
      this.env.options = { some: 'stuff' };
      this.env.run(function () {
        assert.ok(this.runMethod.calledOnce);
        assert.equal(this.args[0], 'my-args');
        assert.equal(this.args[1], this.env.options);
        done();
      }.bind(this));
    });

    it('can take string as args', function (done) {
      var args = 'stub:run module';
      this.env.run(args, function () {
        assert.ok(this.runMethod.calledOnce);
        assert.equal(this.args[0], 'module');
        done();
      }.bind(this));
    });

    it('can take no arguments', function () {
      this.env.arguments = ['stub:run'];
      this.env.run();
      assert.ok(this.runMethod.calledOnce);
    });

    it('launch error if generator is not found', function (done) {
      this.env.on('error', function (err) {
        assert.ok(err.message.indexOf('some:unknown:generator') >= 0)
        done();
      });
      this.env.run('some:unknown:generator');
    });
  });

  describe('#register', function () {
    beforeEach(function () {
      this.simplePath = './fixtures/custom-generator-simple';
      this.extendPath = './fixtures/custom-generator-extend';
      assert.equal(Object.keys(this.env.generators).length, 0, 'env should be empty');
      this.env
        .register(this.simplePath, 'fixtures:custom-generator-simple')
        .register(this.extendPath, 'scaffold');
    });

    it('store registered generators', function () {
      assert.equal(Object.keys(this.env.generators).length, 2);
    });

    it('determine registered Generator namespace and resolved path', function () {
      var simple = this.env.get('fixtures:custom-generator-simple');
      assert.ok(typeof simple === 'function');
      assert.ok(simple.namespace, 'fixtures:custom-generator-simple');
      assert.ok(simple.resolved, path.resolve(this.simplePath));

      var extend = this.env.get('scaffold');
      assert.ok(typeof extend === 'function');
      assert.ok(extend.namespace, 'scaffold');
      assert.ok(extend.resolved, path.resolve(this.extendPath));
    });

    it('throw when String is not passed as first parameter', function () {
      assert.throws(function () { this.env.register(function () {}, 'blop'); });
      assert.throws(function () { this.env.register([], 'blop'); });
      assert.throws(function () { this.env.register(false, 'blop'); });
    });

    // Make sure we don't break the generators hash using `Object.defineProperty`
    it('keep `.generators` store object writable', function () {
      this.env.generators.foo = 'bar';
      assert.equal(this.env.generators.foo, 'bar');
      this.env.generators.foo = 'yo';
      assert.equal(this.env.generators.foo, 'yo');
    });
  });

  describe('#appendLookup', function () {
    it('have default lookups', function () {
      assert.equal(this.env.lookups.slice(-1)[0], 'lib/generators');
    });

    it('adds new filepath to the lookup\'s paths', function () {
      this.env.appendLookup('support/scaffold');
      assert.equal(this.env.lookups.slice(-1)[0], 'support/scaffold');
    });

    it('must receive a filepath', function () {
      assert.throws(this.env.appendLookup.bind(this.env));
    });
  });

  describe('#appendPath', function () {
    it('have default paths', function () {
      assert.equal(this.env.paths[0], '.');
    });

    it('adds new filepath to the load paths', function () {
      this.env.appendPath('support/scaffold');
      assert.equal(this.env.paths.slice(-1)[0], 'support/scaffold');
    });

    it('must receive a filepath', function () {
      assert.throws(this.env.appendPath.bind(this.env));
    });
  });

  describe('#namespace', function () {
    beforeEach(function () {
      this.env
        .register('./fixtures/custom-generator-simple')
        .register('./fixtures/custom-generator-extend')
        .register('./fixtures/custom-generator-extend', 'support:scaffold');
    });

    it('get the list of namespaces', function () {
      assert.deepEqual(this.env.namespaces(), ['simple', 'extend:support:scaffold', 'support:scaffold']);
    });
  });

  describe('#get', function () {
    beforeEach(function () {
      this.generator = require('./fixtures/mocha-generator');
      this.env
        .register('./fixtures/mocha-generator', 'fixtures:mocha-generator')
        .register('./fixtures/mocha-generator', 'mocha:generator');
    });

    it('get a specific generator', function () {
      assert.equal(this.env.get('mocha:generator'), this.generator);
      assert.equal(this.env.get('fixtures:mocha-generator'), this.generator);
    });

    it('walks recursively the namespace to get the closest match', function () {
      assert.equal(this.env.get('mocha:generator:too:many'), this.generator);
    });

    it('returns undefined if namespace is not found', function () {
      assert.equal(this.env.get('not:there'), undefined);
      assert.equal(this.env.get(), undefined);
    });
  });

  describe('Engines', function () {

    before(generators.test.before(path.join(__dirname, 'temp')));

    beforeEach(function () {
      this.generator = new Base([], {
        env: generators(),
        resolved: __filename
      });
    });

    it('allows users to use their prefered engine', function () {
      // engine should be able to take a fn, or a named engine (which we
      // provide adapters to, currently only underscore is supported)
      generators().engine('underscore');
    });

    it('throws on wrong engine', function (done) {
      try {
        generators().engine('underscored');
      } catch (e) {
        done();
      }
    });

    it('properly compiles and renders template',  function (done) {
      var filename = 'temp/boyah.js';

      this.generator.template(path.join(__dirname, 'fixtures/template.jst'), filename, { foo: 'hey' });
      this.generator.conflicter.resolve(function (err) {
        if (err) {
          return done(err);
        }

        helpers.assertTextEqual(fs.readFileSync(filename, 'utf8'), "var hey = 'hey';" + '\n');
        done();
      });
    });

    it('lets you use %% and escape opening tags with underscore engine', function () {
      var tpl = 'prefix/<%%= yeoman.app %>/foo/bar';
      assert.equal(this.generator.engine(tpl), 'prefix/<%= yeoman.app %>/foo/bar');
      assert.equal(this.generator.engine('<%% if(true) { %>'), '<% if(true) { %>');
    });

  });

  describe('#registerStub', function () {
    beforeEach(function () {
      this.simpleDummy = sinon.spy();
      this.completeDummy = function () {};
      util.inherits(this.completeDummy, Base);
      this.env
        .registerStub(this.simpleDummy, 'dummy:simple')
        .registerStub(this.completeDummy, 'dummy:complete');
    });

    it('register a function under a namespace', function () {
      assert.equal(this.completeDummy, this.env.get('dummy:complete'));
    });

    it('extend simple function with Base', function () {
      assert.ok(this.env.get('dummy:simple').super_ === Base);
      this.env.run('dummy:simple');
      assert.ok(this.simpleDummy.calledOnce);
    });

    it('throws if invalid generator', function () {
      assert.throws(this.env.registerStub.bind(this.env, [], 'dummy'), /stub\sfunction/);
    });

    it('throws if invalid namespace', function () {
      assert.throws(this.env.registerStub.bind(this.env, this.simpleDummy), /namespace/);
    });
  });

  describe('#error', function () {
    it('delegate error handling to the listener', function (done) {
      var error = new Error('foo bar');
      this.env.on('error', function (err) {
        assert.equal(error, err);
        done();
      });
      this.env.error(error);
    });

    it('throws error if no listener is set', function () {
      assert.throws(this.env.error.bind(this.env, new Error()));
    });

    it('returns the error', function () {
      var error = new Error('foo bar');
      this.env.on('error', function () {});
      assert.equal(this.env.error(error), error);
    });
  });

  // Events
  // ------

  // A series of events are emitted during the generation process. Both on
  // the global `generators` handler and each individual generators
  // involved in the process.
  describe('Events', function () {
    before(function () {
      var Generator = this.Generator = function () {
        generators.Base.apply(this, arguments);
      };

      Generator.namespace = 'angular:all';

      util.inherits(Generator, generators.Base);

      Generator.prototype.createSomething = function () {};
      Generator.prototype.createSomethingElse = function () {};
    });

    it('emits the series of event on a specific generator', function (done) {
      var angular = new this.Generator([], {
        env: generators(),
        resolved: __filename
      });

      var lifecycle = ['start', 'createSomething', 'createSomethingElse', 'end'];

      function assertEvent(e) {
        return function() {
          assert.equal(e, lifecycle.shift());
          if (e === 'end') {
            done();
          }
        };
      }

      angular
        // Start event, emitted right before "running" the generator.
        .on('start', assertEvent('start'))
        // End event, emitted after the generation process, when every generator method and hooks are executed
        .on('end', assertEvent('end'))
        // Emitted when a conflict is detected, right after the prompt happens.
        // .on('conflict', assertEvent('conflict'))
        // Emitted on every prompt, both for conflict state and generators one.
        // .on('prompt', assertEvent('prompt'))
        // Emitted right before a hook is invoked
        // .on('hook', assertEvent('hook'))
        // Emitted on each generator method
        .on('createSomething', assertEvent('createSomething'))
        .on('createSomethingElse', assertEvent('createSomethingElse'));

      angular.run();
    });

    it('hoists up the series of event from specific generator to the generators handler', function (done) {
      var lifecycle = [
        'generators:start',
        'angular:all:start',
        'angular:all:createSomething',
        'angular:all:createSomethingElse',
        'angular:all:end',
        'generators:end'
      ];

      function assertEvent(ev) {
        return function () {
          assert.equal(ev, lifecycle.shift());
          if (!lifecycle.length) {
            done();
          }
        };
      }

      generators()
        .registerStub(this.Generator, 'angular:all')
        // Series of events proxied from the resolved generator
        .on('generators:start', assertEvent('generators:start'))
        .on('generators:end', assertEvent('generators:end'))
        // .on('conflict', assertEvent('generators:conflict'))
        // .on('prompt', assertEvent('generators:prompt'))
        // .on('hook', assertEvent('generators:start'))

        // Emitted for each generator method invoked, prefix by the generator namespace
        .on('angular:all:createSomething', assertEvent('angular:all:createSomething'))
        .on('angular:all:createSomethingElse', assertEvent('angular:all:createSomethingElse'))

        // Additionally, for more specific events, same prefixing happens on
        // start, end, conflict, prompt and hook.
        .on('angular:all:start', assertEvent('angular:all:start'))
        .on('angular:all:end', assertEvent('angular:all:end'))
        .on('angular:all:conflict', assertEvent('angular:all:conflict'))
        .on('angular:all:prompt', assertEvent('angular:all:prompt'))

        // actual run
        .run('angular:all myapp');
    });
  });
});
