/*global it, describe, before, beforeEach, afterEach */
/*jshint scripturl: true */
'use strict';
var fs = require('fs');
var path = require('path');
var util = require('util');
var sinon = require('sinon');
var generators = require('..');
var Base = generators.Base;
var helpers = generators.test;
var assert = generators.assert;
var events = require('events');
var TerminalAdapter = require('../lib/env/adapter');
var Environment = require('../lib/env');
var Store = require('../lib/env/store');

describe('Environment', function () {

  beforeEach(function () {
    this.env = new Environment([], { 'skip-install': true });
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
      var opts = { foo: 'bar' };
      assert.equal(new Environment(null, opts).options, opts);
    });
  });

  describe('#help()', function () {
    beforeEach(function () {
      this.env
        .register('./fixtures/custom-generator-simple')
        .register('./fixtures/custom-generator-extend');

      this.expected = fs.readFileSync(path.join(__dirname, 'fixtures/help.txt'), 'utf8').trim();

      // lazy "update the help fixtures because something changed" statement
      // fs.writeFileSync(path.join(__dirname, 'fixtures/help.txt'), env.help().trim());
    });

    it('output the general help', function () {
      assert.textEqual(this.env.help().trim(), this.expected);
    });

    it('output the help with a custom bin name', function () {
      this.expected = this.expected.replace('Usage: init', 'Usage: gg');
      assert.textEqual(this.env.help('gg').trim(), this.expected);
    });
    it('instantiates a TerminalAdapter if none provided', function () {
      assert.ok(this.env.adapter instanceof TerminalAdapter, 'Not a TerminalAdapter');
    });

    it('uses the provided object as adapter if any', function () {
      var dummyAdapter = {};
      var env = new Environment(null, null, dummyAdapter);
      assert.equal(env.adapter, dummyAdapter, 'Not the adapter provided');
    });

  });

  describe('#create()', function () {
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
      var args1 = ['yo', 'unicorn'];
      var args = ['foo', 'bar'];
      var generator = this.env.create('stub', { arguments: args1, args: args });
      assert.equal(generator.arguments, args1);
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
      var opts = { foo: 'bar' };
      var generator = this.env.create('stub', { options: opts });
      assert.equal(generator.options, opts);
    });

    it('default options to `env.options` content', function () {
      this.env.options = { foo: 'bar' };
      assert.equal(this.env.create('stub').options.foo, 'bar');
    });

    it('throws if Generator is not registered', function () {
      assert.throws(this.env.create.bind(this.end, 'i:do:not:exist'));
    });

    it('add the env as property on the options', function () {
      assert.equal(this.env.create('stub').options.env, this.env);
    });

    it('add the Generator resolved path on the options', function () {
      assert.equal(this.env.create('stub').options.resolved, this.env.get('stub').resolved);
    });

    it('adds the namespace on the options', function () {
      assert.equal(this.env.create('stub').options.namespace, 'stub');
    });

    it('adds the namespace as called on the options', function () {
      assert.equal(this.env.create('stub:foo:bar').options.namespace, 'stub:foo:bar');
    });

    describe('NamedBase', function () {
      beforeEach(function () {
        this.env.register('./fixtures/custom-generator-extend', 'scaffold');

        this.NamedGenerator = this.env.get('scaffold');
      });

      it('does not raise an error when the help option is provided but the required name parameter is not', function () {
        assert.doesNotThrow(this.env.create.bind(this.env, 'scaffold', { options: { help: true }}));
      });

      it('calls the named base generator with the help option and provides the required name parameter', function () {
        var generator = this.env.create('scaffold', { args: ['foo'], options: { help: true }});

        assert.equal(generator.options.help, true);
        assert.equal(generator.name, 'foo');
      });

      it('throws an error when the required name parameter is not provided', function () {
        assert.throws(this.env.create.bind(this.env, 'scaffold'));
      });
    });
  });

  describe('#run()', function () {
    beforeEach(function () {
      var self = this;
      this.Stub = Base.extend({
        constructor: function () {
          self.args = arguments;
          Base.apply(this, arguments);
        },
        exec: function () {}
      });
      this.runMethod = sinon.spy(Base.prototype, 'run');
      this.env.registerStub(this.Stub, 'stub:run');
    });

    afterEach(function () {
      this.runMethod.restore();
    });

    it('runs a registered generator', function (done) {
      this.env.run(['stub:run'], function () {
        assert.ok(this.runMethod.calledOnce);
        done();
      }.bind(this));
    });

    it('pass args and options to the runned generator', function (done) {
      var args = ['stub:run', 'module'];
      var options = { 'skip-install': true };
      this.env.run(args, options, function () {
        assert.ok(this.runMethod.calledOnce);
        assert.equal(this.args[0], 'module');
        assert.equal(this.args[1], options);
        done();
      }.bind(this));
    });

    it('without options, it default to env.options', function (done) {
      var args = ['stub:run', 'foo'];
      this.env.options = { some: 'stuff', 'skip-install': true };
      this.env.run(args, function () {
        assert.ok(this.runMethod.calledOnce);
        assert.equal(this.args[0], 'foo');
        assert.equal(this.args[1], this.env.options);
        done();
      }.bind(this));
    });

    it('without args, it default to env.arguments', function (done) {
      this.env.arguments = ['stub:run', 'my-args'];
      this.env.options = { 'skip-install': true };
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
        assert.ok(err.message.indexOf('some:unknown:generator') >= 0);
        done();
      });
      this.env.run('some:unknown:generator');
    });

    it('returns the generator', function () {
      assert.ok(this.env.run('stub:run') instanceof Base);
    });
  });

  describe('#register()', function () {
    beforeEach(function () {
      this.simplePath = './fixtures/custom-generator-simple';
      this.extendPath = './fixtures/custom-generator-extend';
      assert.equal(this.env.namespaces().length, 0, 'env should be empty');
      this.env
        .register(this.simplePath, 'fixtures:custom-generator-simple')
        .register(this.extendPath, 'scaffold');
    });

    it('store registered generators', function () {
      assert.equal(this.env.namespaces().length, 2);
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
  });

  describe('#registerStub()', function () {
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

    it('extend simple function with Base', function (done) {
      assert.implement(this.env.get('dummy:simple'), Base);
      this.env.run('dummy:simple', function () {
        assert.ok(this.simpleDummy.calledOnce);
        done();
      }.bind(this));
    });

    it('throws if invalid generator', function () {
      assert.throws(this.env.registerStub.bind(this.env, [], 'dummy'), /stub\sfunction/);
    });

    it('throws if invalid namespace', function () {
      assert.throws(this.env.registerStub.bind(this.env, this.simpleDummy), /namespace/);
    });
  });

  describe('#namespaces()', function () {
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

  describe('#getGeneratorsMeta()', function () {
    beforeEach(function () {
      this.generatorPath = './fixtures/custom-generator-simple';
      this.env.register('./fixtures/custom-generator-simple');
    });

    it('get the registered Generators metadatas', function () {
      var meta = this.env.getGeneratorsMeta().simple;
      assert.deepEqual(meta.resolved, require.resolve(this.generatorPath));
      assert.deepEqual(meta.namespace, 'simple');
    });
  });

  describe('#namespace()', function () {
    it('create namespace from path', function () {
      assert.equal(this.env.namespace('backbone/all/index.js'), 'backbone:all');
      assert.equal(this.env.namespace('backbone/all/main.js'), 'backbone:all');
      assert.equal(this.env.namespace('backbone/all'), 'backbone:all');
      assert.equal(this.env.namespace('backbone/all.js'), 'backbone:all');
      assert.equal(this.env.namespace('backbone.js'), 'backbone');

      assert.equal(this.env.namespace('generator-backbone/all.js'), 'backbone:all');
      assert.equal(this.env.namespace('generator-mocha/backbone/model/index.js'), 'mocha:backbone:model');
      assert.equal(this.env.namespace('generator-mocha/backbone/model.js'), 'mocha:backbone:model');
      assert.equal(this.env.namespace('node_modules/generator-mocha/backbone/model.js'), 'mocha:backbone:model');
    });

    it('handle relative paths', function () {
      assert.equal(this.env.namespace('../local/stuff'), 'local:stuff');
      assert.equal(this.env.namespace('./local/stuff'), 'local:stuff');
      assert.equal(this.env.namespace('././local/stuff'), 'local:stuff');
      assert.equal(this.env.namespace('../../local/stuff'), 'local:stuff');
    });

    it('handles weird paths', function () {
      assert.equal(this.env.namespace('////gen/all'), 'gen:all');
      assert.equal(this.env.namespace('generator-backbone///all.js'), 'backbone:all');
      assert.equal(this.env.namespace('generator-backbone/././all.js'), 'backbone:all');
      assert.equal(this.env.namespace('generator-backbone/generator-backbone/all.js'), 'backbone:all');
    });

    it('works with Windows\' paths', function () {
      assert.equal(this.env.namespace('backbone\\all\\main.js'), 'backbone:all');
      assert.equal(this.env.namespace('backbone\\all'), 'backbone:all');
      assert.equal(this.env.namespace('backbone\\all.js'), 'backbone:all');
    });

    it('remove lookups from namespace', function () {
      assert.equal(this.env.namespace('backbone/generators/all/index.js'), 'backbone:all');
      assert.equal(this.env.namespace('backbone/lib/generators/all/index.js'), 'backbone:all');
    });

    it('remove path before the generator name', function () {
      assert.equal(this.env.namespace('/Users/yeoman/.nvm/v0.10.22/lib/node_modules/generator-backbone/all/index.js'), 'backbone:all');
      assert.equal(this.env.namespace('/usr/lib/node_modules/generator-backbone/all/index.js'), 'backbone:all');
    });
  });

  describe('#get()', function () {
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

  describe('#error()', function () {
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

  describe('#alias()', function () {
    it('apply regex and replace with alternative value', function () {
      this.env.alias(/^([^:]+)$/, '$1:app');
      assert.equal(this.env.alias('foo'), 'foo:app');
    });

    it('apply multiple regex', function () {
      this.env.alias(/^([a-zA-Z0-9:\*]+)$/, 'generator-$1');
      this.env.alias(/^([^:]+)$/, '$1:app');
      assert.equal(this.env.alias('foo'), 'generator-foo:app');
    });

    it('apply latest aliases first', function () {
      this.env.alias(/^([^:]+)$/, '$1:all');
      this.env.alias(/^([^:]+)$/, '$1:app');
      assert.equal(this.env.alias('foo'), 'foo:app');
    });

    it('alias empty namespace to `:app` by default', function () {
      assert.equal(this.env.alias('foo'), 'foo:app');
    });
  });

  describe('.enforceUpdate()', function () {
    beforeEach(function () {
      this.env = new Environment();
      delete this.env.adapter;
      delete this.env.runLoop;

    });

    it('add an adapter', function () {
      Environment.enforceUpdate(this.env);
      assert(this.env.adapter);
    });

    it('add a runLoop', function () {
      Environment.enforceUpdate(this.env);
      assert(this.env.runLoop);
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
        resolved: __filename,
        'skip-install': true
      });

      var lifecycle = ['start', 'createSomething', 'createSomethingElse', 'end'];

      function assertEvent(e) {
        return function () {
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

      generators([], { 'skip-install': true })
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

    it('only call the end event once (bug #402)', function (done) {
      function GeneratorOnce() {
        generators.Base.apply(this, arguments);
        this.sourceRoot(path.join(__dirname, 'fixtures'));
        this.destinationRoot(path.join(__dirname, 'temp'));
      }

      util.inherits(GeneratorOnce, generators.Base);

      GeneratorOnce.prototype.createDuplicate = function () {
        this.copy('foo-copy.js');
        this.copy('foo-copy.js');
      };

      var generatorOnce = new GeneratorOnce([], {
        env: generators(),
        resolved: __filename,
        'skip-install': true
      });

      var isFirstEndEvent = true;

      generatorOnce.on('end', function () {
        assert.ok(isFirstEndEvent);
        if (isFirstEndEvent) {
          done();
        }
        isFirstEndEvent = false;
      });

      generatorOnce.run();
    });
  });

  describe('Store', function () {
    beforeEach(function () {
      this.store = new Store();
    });

    describe('#add() / #get()', function () {
      beforeEach(function () {
        this.modulePath = path.join(__dirname, 'fixtures/mocha-generator');
        this.module = require(this.modulePath);
      });

      describe('storing as module', function () {
        beforeEach(function () {
          this.store.add('foo:module', this.module);
          this.outcome = this.store.get('foo:module');
        });

        it('store and return the module', function () {
          assert.equal(this.outcome, this.module);
        });

        it('assign meta data to the module', function () {
          assert.equal(this.outcome.namespace, 'foo:module');
        });

        it('assign dummy resolved value (can\'t determine the path of an instantiated)', function () {
          assert.ok(this.outcome.resolved.length > 0);
        });
      });

      describe('storing as module path', function () {
        beforeEach(function () {
          this.store.add('foo:path', this.modulePath);
          this.outcome = this.store.get('foo:path');
        });

        it('store and returns the required module', function () {
          assert.notEqual(this.outcome, this.modulePath);
          assert.equal(this.outcome.usage, 'Usage can be used to customize the help output');
        });

        it('assign meta data to the module', function () {
          assert.equal(this.outcome.resolved, this.modulePath);
          assert.equal(this.outcome.namespace, 'foo:path');
        });
      });

      it('normalize Generators', function () {
        var method = function () {};
        this.store.add('foo', method);
        var Generator = this.store.get('foo');

        assert.implement(Generator.prototype, Base.prototype);
        assert.equal(Generator.prototype.exec, method);
      });
    });

    describe('#namespaces()', function () {
      beforeEach(function () {
        this.store.add('foo', {});
        this.store.add('lab', {});
      });

      it('return stored module namespaces', function () {
        assert.deepEqual(this.store.namespaces(), ['foo', 'lab']);
      });
    });
  });

});
