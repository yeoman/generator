/*global describe, before, beforeEach, after, afterEach, it */
'use strict';
var fs = require('fs');
var os = require('os');
var path = require('path');
var util = require('util');
var sinon = require('sinon');
var mkdirp = require('mkdirp');
var mockery = require('mockery');
var rimraf = require('rimraf');
var through = require('through2');
var pathExists = require('path-exists');
var Promise = require('pinkie-promise');
var yeoman = require('yeoman-environment');
var userHome = require('user-home');

var LF = require('os').EOL;

mockery.enable({
  warnOnReplace: false,
  warnOnUnregistered: false
});

var TestAdapter = require('yeoman-test/lib/adapter').TestAdapter;
var generators = require('..');
var Conflicter = require('../lib/util/conflicter');
var helpers = require('yeoman-test');
var assert = require('yeoman-assert');
var tmpdir = path.join(os.tmpdir(), 'yeoman-base');
var resolveddir = path.join(os.tmpdir(), 'yeoman-base-generator');

describe('generators.Base', function () {
  before(helpers.setUpTestDirectory(tmpdir));

  beforeEach(function () {
    this.env = yeoman.createEnv([], { 'skip-install': true }, new TestAdapter());
    mkdirp.sync(resolveddir);
    this.Dummy = generators.Base.extend({
      exec: sinon.spy()
    });

    this.env.registerStub(this.Dummy, 'ember:all');
    this.env.registerStub(this.Dummy, 'hook1:ember');
    this.env.registerStub(this.Dummy, 'hook2:ember:all');
    this.env.registerStub(this.Dummy, 'hook3');

    this.env.registerStub(generators.Base.extend({
      writing: function () {
        this.fs.write(
          path.join(tmpdir, 'app/scripts/models/application-model.js'),
          '// ...'
        );
      }
    }), 'hook4');

    this.dummy = new this.Dummy(['bar', 'baz', 'bom'], {
      foo: false,
      something: 'else',
      // mandatory options, created by the env#create() helper
      resolved: resolveddir,
      namespace: 'dummy',
      env: this.env,
      'skip-install': true
    });

    this.dummy
      .hookFor('hook1', { as: 'ember' })
      .hookFor('hook2', { as: 'ember:all' })
      .hookFor('hook3')
      .hookFor('hook4');
  });

  describe('constructor', function () {
    it('set the CWD where `.yo-rc.json` is found', function () {
      var projectDir = path.join(__dirname, 'fixtures/dummy-project');
      process.chdir(path.join(projectDir, 'subdir'));
      this.env.cwd = process.cwd();

      var dummy = new this.Dummy(['foo'], {
        resolved: 'ember/all',
        env: this.env
      });

      assert.equal(process.cwd(), projectDir);
      assert.equal(dummy.destinationPath(), projectDir);
    });

    it('use the environment options', function () {
      this.env.registerStub(generators.Base.extend(), 'ember:model');

      var generator = this.env.create('ember:model', {
        options: {
          'test-framework': 'jasmine'
        }
      });

      assert.equal(generator.options['test-framework'], 'jasmine');
    });

    it('set generator.options from constructor options', function () {
      var generator = new generators.Base({
        env: this.env,
        resolved: 'test',
        'test-framework': 'mocha'
      });

      assert.equal(generator.options['test-framework'], 'mocha');
    });

    it('set options based on nopt arguments', function () {
      var generator = new generators.Base(['--foo', 'bar'], {
        env: this.env,
        resolved: 'test'
      });

      assert.equal(generator.options.foo, true);
    });

    it('set arguments based on nopt arguments', function () {
      var generator = new generators.Base(['--foo', 'bar'], {
        env: this.env,
        resolved: 'test'
      });

      generator.argument('baz');
      assert.equal(generator.baz, 'bar');
    });

    it('set options with false values', function (done) {
      var generator = helpers
        .run(path.join(__dirname, './fixtures/options-generator'))
        .withOptions({ testOption: false }).on('end', function () {
          assert.equal(generator.options.testOption, false);
          done();
        });
    });

    it('setup fs editor', function () {
      var generator = new generators.Base([], {
        env: this.env,
        resolved: 'test'
      });

      assert(generator.fs);
    });
  });

  describe('prototype', function () {
    it('methods doesn\'t conflict with Env#runQueue', function () {
      assert.notImplement(generators.Base.prototype, this.env.runLoop.queueNames);
    });
  });

  describe('#appname', function () {
    it('is set to the `determineAppname()` return value', function () {
      assert.equal(this.dummy.appname, this.dummy.determineAppname());
    });
  });

  describe('#determineAppname()', function () {
    beforeEach(function () {
      process.chdir(tmpdir);
    });

    afterEach(function () {
      rimraf.sync('bower.json');
      rimraf.sync('package.json');
      delete require.cache[path.join(process.cwd(), 'bower.json')];
      delete require.cache[path.join(process.cwd(), 'package.json')];
    });

    it('returns appname from bower.json', function () {
      this.dummy.fs.write(
        this.dummy.destinationPath('bower.json'),
        '{ "name": "app-name" }'
      );

      assert.equal(this.dummy.determineAppname(), 'app name');
    });

    it('returns appname from package.json', function () {
      this.dummy.fs.write(
        this.dummy.destinationPath('package.json'),
        '{ "name": "package_app-name" }'
      );

      assert.equal(this.dummy.determineAppname(), 'package_app name');
    });

    it('returns appname from the current directory', function () {
      assert.equal(this.dummy.determineAppname(), 'yeoman base');
    });
  });

  describe('.extend()', function () {
    it('create a new object inheriting the Generator', function () {
      var gen = new (generators.Base.extend())([], { resolved: 'path/', env: this.env });
      assert.ok(gen instanceof generators.Base);
    });

    it('pass the extend method along', function () {
      var Sub = generators.Base.extend();
      assert.equal(Sub.extend, generators.Base.extend);
    });

    it('assign prototype methods', function () {
      var proto = { foo: function () {}};
      var Sub = generators.Base.extend(proto);
      assert.equal(Sub.prototype.foo, proto.foo);
    });

    it('assign static methods', function () {
      var staticProps = { foo: function () {}};
      var Sub = generators.Base.extend({}, staticProps);
      assert.equal(Sub.foo, staticProps.foo);
    });
  });

  describe('#run()', function () {
    beforeEach(function () {
      this.TestGenerator = generators.Base.extend({
        exec: sinon.spy(),
        exec2: sinon.spy(),
        exec3: sinon.spy(),
        _private: sinon.spy(),
        prompting: {
          m1: sinon.spy(),
          m2: sinon.spy(),
          _private: sinon.spy(),
          prop: 'foo'
        },
        initializing: sinon.spy()
      });
      this.execSpy = this.TestGenerator.prototype.exec;

      this.testGen = new this.TestGenerator([], {
        resolved: 'generator-ember/all/index.js',
        namespace: 'dummy',
        env: this.env,
        'skip-install': true
      });

      this.resolveSpy = sinon.spy(this.testGen.conflicter, 'resolve');
    });

    it('run all methods in the given generator', function (done) {
      this.testGen.run(done);
    });

    it('turn on _running flag', function () {
      this.testGen.run();
      assert.ok(this.testGen._running);
    });

    it('run prototype methods (not instances one)', function (done) {
      this.testGen.exec = sinon.spy();
      this.testGen.run(function () {
        assert.ok(this.execSpy.calledOnce);
        assert.equal(this.testGen.exec.callCount, 0);
        done();
      }.bind(this));
    });

    it('don\'t try running prototype attributes', function (done) {
      this.TestGenerator.prototype.prop = 'something';
      this.testGen.run(done);
    });

    it('pass instance .args property to the called methods', function (done) {
      this.testGen.args = ['2', 'args'];
      this.testGen.run(function () {
        assert(this.execSpy.withArgs('2', 'args').calledOnce);
        done();
      }.bind(this));
    });

    it('resolve conflicts after it ran', function (done) {
      this.testGen.run(function () {
        assert.equal(this.resolveSpy.callCount, 1);
        done();
      }.bind(this));
    });

    it('can emit error from async methods', function (done) {
      this.TestGenerator.prototype.throwing = function () {
        this.async()('some error');
      };

      this.testGen.on('error', function (err) {
        assert.equal(err, 'some error');
        done();
      });

      this.testGen.run();
    });

    it('can emit error from sync methods', function (done) {
      var error = new Error();

      this.TestGenerator.prototype.throwing = function () {
        throw error;
      };

      this.testGen.on('error', function (err) {
        assert.equal(err, error);
        done();
      });

      this.testGen.run();
    });

    it('stop queue processing once an error is thrown', function (done) {
      var error = new Error();
      var spy = sinon.spy();

      this.TestGenerator.prototype.throwing = function () {
        throw error;
      };
      this.TestGenerator.prototype.afterError = spy;

      this.testGen.on('error', sinon.spy());
      this.testGen.run(function (err) {
        assert.equal(err, error);
        done();
      });
    });

    it('handle function returning promises as asynchronous', function (done) {
      var spy1 = sinon.spy();
      var spy2 = sinon.spy();

      this.TestGenerator.prototype.first = function () {
        return new Promise(function (resolve) {
          setTimeout(function () {
            spy1();
            resolve();
          }, 10);
        });
      };

      this.TestGenerator.prototype.second = function () {
        spy2();
      };

      this.testGen.run(function () {
        spy1.calledBefore(spy2);
        done();
      });
    });

    it('handle failing promises as errors', function (done) {
      this.TestGenerator.prototype.failing = function () {
        return new Promise(function (resolve, reject) {
          reject('some error');
        });
      };

      this.testGen.on('error', function (err) {
        assert.equal(err, 'some error');
        done();
      });

      this.testGen.run();
    });

    it('run methods in series', function (done) {
      var async1Running = false;
      var async1Ran = false;

      this.TestGenerator.prototype.async1 = function () {
        async1Running = true;
        var cb = this.async();

        setTimeout(function () {
          async1Running = false;
          async1Ran = true;
          cb();
        }, 10);
      };

      this.TestGenerator.prototype.async2 = function () {
        assert(!async1Running);
        assert(async1Ran);
        done();
      };

      this.testGen.run();
    });

    it('throws if no method is available', function () {
      var gen = new (generators.Base.extend())([], {
        resolved: 'generator-ember/all/index.js',
        namespace: 'dummy',
        env: this.env
      });

      assert.throws(gen.run.bind(gen));
    });

    it('will run non-enumerable methods', function (done) {
      var Generator = function () {
        generators.Base.apply(this, arguments);
      };

      Generator.prototype = Object.create(generators.Base.prototype);
      Object.defineProperty(Generator.prototype, 'nonenumerable', {
        value: sinon.spy(),
        configurable: true,
        writable: true
      });

      var gen = new Generator([], {
        resolved: 'dummy',
        namespace: 'dummy',
        env: this.env
      });

      gen.run(function () {
        assert(gen.nonenumerable.called);
        done();
      });
    });

    it('ignore underscore prefixed method', function (done) {
      this.testGen.run(function () {
        assert(this.TestGenerator.prototype._private.notCalled);
        done();
      }.bind(this));
    });

    it('run methods in a queue hash', function (done) {
      this.testGen.run(function () {
        assert(this.TestGenerator.prototype.prompting.m1.calledOnce);
        assert(this.TestGenerator.prototype.prompting.m2.calledOnce);
        done();
      }.bind(this));
    });

    it('ignore underscore prefixed method in a queue hash', function (done) {
      this.testGen.run(function () {
        assert(this.TestGenerator.prototype.prompting._private.notCalled);
        done();
      }.bind(this));
    });

    it('run named queued methods in order', function (done) {
      var initSpy = this.TestGenerator.prototype.initializing;
      var promptSpy = this.TestGenerator.prototype.prompting.m1;

      this.testGen.run(function () {
        assert(initSpy.calledBefore(promptSpy));
        done();
      });
    });

    it('run queued methods in order even if not in order in prototype', function (done) {
      var initSpy = this.TestGenerator.prototype.initializing;
      var execSpy = this.TestGenerator.prototype.exec;

      this.testGen.run(function () {
        assert(initSpy.calledBefore(execSpy));
        done();
      });
    });

    it('commit mem-fs to disk', function (done) {
      var filepath;
      var oldFilePath;

      this.TestGenerator.prototype.writing = function () {
        oldFilePath = path.join(this.destinationRoot(), 'old-system.txt');
        // Just ensure we don't have issue if both old and new system run.
        this.write(oldFilePath, 'hey');
        this.fs.write(
          filepath = path.join(this.destinationRoot(), 'fromfs.txt'),
          'generated'
        );
      };

      this.testGen.run(function () {
        assert(pathExists.sync(oldFilePath));
        assert(pathExists.sync(filepath));
        done();
      });
    });

    it('allow skipping file writes to disk', function (done) {
      var action = { action: 'skip' };
      var filepath = path.join(__dirname, '/fixtures/conflict.js');
      assert(pathExists.sync(filepath));

      this.TestGenerator.prototype.writing = function () {
        this.fs.write(filepath, 'some new content');
      };

      var env = yeoman.createEnv([], { 'skip-install': true }, new TestAdapter(action));
      var testGen = new this.TestGenerator([], {
        resolved: 'generator/app/index.js',
        namespace: 'dummy',
        env: env
      });

      testGen.run(function () {
        assert.equal(fs.readFileSync(filepath, 'utf8'), 'var a = 1;' + LF);
        done();
      });
    });

    it('does not prompt again for skipped files', function (done) {
      var action = { action: 'skip' };
      var filepath = path.join(__dirname, '/fixtures/conflict.js');
      var filepath2 = path.join(__dirname, '/fixtures/file-conflict.txt');

      sinon.spy(Conflicter.prototype, 'checkForCollision');
      var env = yeoman.createEnv([], { 'skip-install': true }, new TestAdapter(action));
      env.registerStub(this.Dummy, 'dummy:app');

      // The composed generator need to write at least one file for it to go through it's
      // file writing cycle
      this.Dummy.prototype.writing = function () {
        this.fs.write(filepath2, 'foo');
      };

      this.TestGenerator.prototype.writing = function () {
        this.fs.write(filepath, 'some new content');
        this.composeWith('dummy:app');
      };

      var testGen = new this.TestGenerator([], {
        resolved: 'generator/app/index.js',
        namespace: 'dummy',
        env: env
      });

      testGen.run(function () {
        sinon.assert.calledTwice(Conflicter.prototype.checkForCollision);
        Conflicter.prototype.checkForCollision.restore();
        done();
      });
    });

    it('does not pass config file to conflicter', function (done) {
      this.TestGenerator.prototype.writing = function () {
        fs.writeFileSync(this.destinationPath('.yo-rc.json'), '{"foo": 3}');
        fs.writeFileSync(path.join(userHome, '.yo-rc-global.json'), '{"foo": 3}');
        this.config.set('bar', 1);
        this._globalConfig.set('bar', 1);
      };

      this.testGen.run(done);
    });

    it('allows file writes in any priorities', function (done) {
      this.TestGenerator.prototype.end = function () {
        this.fs.write(this.destinationPath('foo.txt'), 'test');
      };

      this.testGen.run(function () {
        assert(pathExists.sync(this.testGen.destinationPath('foo.txt')));
        done();
      }.bind(this));
    });
  });

  describe('#argument()', function () {
    it('add a new argument to the generator instance', function () {
      assert.equal(this.dummy._arguments.length, 0);
      this.dummy.argument('foo');
      assert.equal(this.dummy._arguments.length, 1);
    });

    it('create the property specified with value from positional args', function () {
      this.dummy.argument('foo');
      assert.equal(this.dummy.foo, 'bar');
    });

    it('can still be set as a property once defined', function () {
      this.dummy.argument('foo');
      this.dummy.foo = 'barbar';
      assert.equal(this.dummy.foo, 'barbar');
    });

    it('slice positional arguments when config.type is Array', function () {
      this.dummy.argument('bar', { type: Array });
      assert.deepEqual(this.dummy.bar, ['bar', 'baz', 'bom']);
    });

    it('raise an error if required arguments are not provided', function (done) {
      var dummy = new generators.Base([], {
        env: this.env,
        resolved: 'dummy/all'
      }).on('error', function () {
        done();
      });

      dummy.argument('foo', { required: true });
    });

    it('doesn\'t raise an error if required arguments are not provided, but the help option has been specified', function () {
      var dummy = new generators.Base([], {
        env: this.env,
        resolved: 'dummy:all'
      });

      dummy.options.help = true;

      assert.equal(dummy._arguments.length, 0);
      assert.doesNotThrow(dummy.argument.bind(dummy, 'foo', { required: true }));
      assert.equal(dummy._arguments.length, 1);
    });

    it('can be called before #option()', function () {
      var dummy = new generators.Base(['--foo', 'bar', 'baz'], {
        env: this.env,
        resolved: 'dummy/all'
      });

      dummy.argument('baz');
      dummy.option('foo', { type: String });

      assert.equal(dummy.baz, 'baz');
    });
  });

  describe('#option()', function () {
    it('add a new option to the set of generator expected options', function () {
      // every generator have the --help options
      var generator = new this.Dummy([], {
        env: this.env,
        resolved: 'test'
      });

      generator.option('foo');
      assert.deepEqual(generator._options.foo, {
        desc: 'Description for foo',
        name: 'foo',
        type: Boolean,
        default: undefined,
        hide: false
      });
    });

    it('allow aliasing options', function () {
      var Generator = generators.Base.extend({
        constructor: function () {
          generators.Base.apply(this, arguments);

          this.option('long-name', {
            alias: 'short-name'
          });
        }
      });

      var gen = new Generator({
        env: this.env,
        resolved: 'test',
        'short-name': 'that value'
      });

      assert.equal(gen.options['long-name'], 'that value');
    });
  });

  describe('#parseOptions()', function () {
    beforeEach(function () {
      this.dummy = new this.Dummy(['start', '--foo', 'bar', '-s', 'baz', 'remain'], {
        env: this.env,
        resolved: 'test'
      });

      this.dummy.option('foo', {
        type: String
      });

      this.dummy.option('shortOpt', {
        type: String,
        alias: 's'
      });
    });

    it('set generator options', function () {
      this.dummy.parseOptions();
      assert.equal(this.dummy.options.foo, 'bar');
    });

    it('set generator alias options', function () {
      this.dummy.parseOptions();
      assert.equal(this.dummy.options.shortOpt, 'baz');
    });

    it('set args to what remains', function () {
      this.dummy.parseOptions();
      assert.deepEqual(this.dummy.args, ['start', 'remain']);
    });

    it('gracefully handle no args', function () {
      var dummy = new this.Dummy({
        env: this.env,
        resolved: 'test'
      });

      dummy.option('foo', {
        type: String
      });

      dummy.parseOptions();
      assert.equal(dummy.options.foo, undefined);
    });
  });

  describe('#runHooks()', function () {
    it('go through all registered hooks, and invoke them in series', function (done) {
      this.dummy.runHooks(function () {
        fs.stat('app/scripts/models/application-model.js', done);
      });
    });
  });

  describe('#hookFor()', function () {
    it('emit errors if called when running', function () {
      try {
        this.dummy.hookFor('maoow');
      } catch (err) {
        assert.equal(err.message, 'hookFor must be used within the constructor only');
      }
    });

    it('create the matching option', function () {
      this.dummy._running = false;
      this.dummy.hookFor('something');

      assert.deepEqual(this.dummy._options.something, {
        desc: 'Something to be invoked',
        name: 'something',
        type: Boolean,
        default: 'else',
        hide: false
      });
    });

    it('update the internal hooks holder', function () {
      this.dummy.hookFor('something');
      assert.deepEqual(this.dummy._hooks.pop(), { name: 'something' });
    });
  });

  describe('#defaultFor()', function () {
    it('return the value for the option name, doing lookup in options and Grunt config', function () {
      var name = this.dummy.defaultFor('something');
      assert.equal(name, 'else');
    });
  });

  describe('#composeWith()', function () {
    beforeEach(function () {
      this.dummy = new this.Dummy([], {
        resolved: 'unknown',
        namespace: 'dummy',
        env: this.env,
        'skip-install': true
      });

      this.spy = sinon.spy();
      this.GenCompose = generators.Base.extend({ exec: this.spy });
      this.env.registerStub(this.GenCompose, 'composed:gen');
    });

    it('runs the composed generators', function (done) {
      this.dummy.composeWith('composed:gen');
      var runSpy = sinon.spy(this.dummy, 'run');

      // I use a setTimeout here just to make sure composeWith() doesn't start the
      // generator before the base one is ran.
      setTimeout(function () {
        this.dummy.run(function () {
          sinon.assert.callOrder(runSpy, this.spy);
          assert(this.spy.calledAfter(runSpy));
          done();
        }.bind(this));
      }.bind(this), 100);
    });

    it('run the composed generator even if main generator is already running.', function (done) {
      this.Dummy.prototype.writing = function () {
        this.composeWith('composed:gen');
      };

      this.dummy.run(function () {
        assert(this.spy.called);
        done();
      }.bind(this));
    });

    it('pass options and arguments to the composed generators', function (done) {
      this.dummy.composeWith('composed:gen', {
        options: { foo: 'bar', 'skip-install': true },
        arguments: ['foo']
      });

      this.dummy.run(function () {
        assert.equal(this.spy.firstCall.thisValue.options.foo, 'bar');
        assert.deepEqual(this.spy.firstCall.thisValue.args, ['foo']);
        done();
      }.bind(this));
    });

    describe('when passing a local path to a generator', function () {
      beforeEach(function () {
        this.spy = sinon.spy();
        this.stubPath = path.join(__dirname, 'fixtures/mocha-generator');
        this.LocalDummy = generators.Base.extend({ exec: this.spy });
        mockery.registerMock(this.stubPath, this.LocalDummy);
      });

      it('runs the composed generator', function (done) {
        this.dummy.composeWith('dumb', {}, { local: this.stubPath });
        this.dummy.run(function () {
          assert(this.LocalDummy.prototype.exec.called);
          done();
        }.bind(this));
      });

      it('pass options and arguments to the composed generators', function (done) {
        this.dummy.composeWith('dumb', {
          options: { foo: 'bar', 'skip-install': true },
          arguments: ['foo']
        }, { local: this.stubPath });

        this.dummy.run(function () {
          assert.equal(this.spy.firstCall.thisValue.options.foo, 'bar');
          assert.deepEqual(this.spy.firstCall.thisValue.args, ['foo']);
          done();
        }.bind(this));
      });

      it('sets correct metadata on the Generator constructor', function (done) {
        this.dummy.composeWith('dumb', {}, { local: this.stubPath });
        this.dummy.run(function () {
          assert.equal(this.spy.firstCall.thisValue.options.namespace, 'dumb');
          assert.equal(
            this.spy.firstCall.thisValue.options.resolved,
            require.resolve(this.stubPath)
          );
          done();
        }.bind(this));
      });
    });
  });

  describe('#desc()', function () {
    it('update the internal description', function () {
      this.dummy.desc('A new desc for this generator');
      assert.equal(this.dummy.description, 'A new desc for this generator');
    });
  });

  describe('#help()', function () {
    it('return the expected help output', function () {
      this.dummy.option('ooOoo');
      this.dummy.argument('baz', {
        type: Number,
        required: false,
        desc: 'definition; explanation; summary'
      });
      this.dummy.desc('A new desc for this generator');

      var help = this.dummy.help();
      var expected = [
        'Usage:',
        'yo dummy [options] [<baz>]',
        '',
        'A new desc for this generator',
        '',
        'Options:',
        '-h, --help # Print the generator\'s options and usage',
        '--skip-cache # Do not remember prompt answers Default: false',
        '--skip-install # Do not automatically install dependencies Default: false',
        '--hook1 # Hook1 to be invoked',
        '--hook2 # Hook2 to be invoked',
        '--hook3 # Hook3 to be invoked',
        '--hook4 # Hook4 to be invoked',
        '--ooOoo # Description for ooOoo',
        '',
        'Arguments:',
        'baz # definition; explanation; summary Type: Number Required: false',
        ''
      ];

      help.split('\n').forEach(function (line, i) {
        // do not test whitespace; we care about the content, not formatting.
        // formatting is best left up to the tests for module "text-table"
        assert.textEqual(line.trim().replace(/\s+/g, ' '), expected[i]);
      });
    });
  });

  describe('#usage()', function () {
    it('returns the expected usage output with arguments', function () {
      this.dummy.argument('baz', {
        type: Number,
        required: false
      });

      var usage = this.dummy.usage();
      assert.equal(usage.trim(), 'yo dummy [options] [<baz>]');
    });

    it('returns the expected usage output without arguments', function () {
      this.dummy._arguments.length = 0;
      var usage = this.dummy.usage();
      assert.equal(usage.trim(), 'yo dummy [options]');
    });

    it('returns the expected usage output without options', function () {
      this.dummy._arguments.length = 0;
      this.dummy._options = {};
      var usage = this.dummy.usage();
      assert.equal(usage.trim(), 'yo dummy');
    });
  });

  describe('#config', function () {
    it('provide a storage instance', function () {
      assert.ok(this.dummy.config instanceof require('../lib/util/storage'));
    });

    it('is updated when destinationRoot change', function () {
      sinon.spy(this.Dummy.prototype, '_getStorage');
      this.dummy.destinationRoot('foo');
      assert.equal(this.Dummy.prototype._getStorage.callCount, 1);
      this.dummy.destinationRoot();
      assert.equal(this.Dummy.prototype._getStorage.callCount, 1);
      this.dummy.destinationRoot('foo');
      assert.equal(this.Dummy.prototype._getStorage.callCount, 2);
      this.Dummy.prototype._getStorage.restore();
    });
  });

  describe('#gruntfile', function () {
    beforeEach(function () {
      this.GruntfileGenerator = generators.Base.extend({
        grunt: function () {
          this.gruntfile.insertConfig('foo', '{}');
        }
      });

      this.gruntGenerator = new this.GruntfileGenerator([], {
        resolved: 'unknown',
        namespace: 'dummy',
        env: this.env,
        'skip-install': true,
        force: true
      });
    });

    it('expose the gruntfile editor API', function () {
      assert(this.gruntGenerator.gruntfile instanceof require('gruntfile-editor'));
    });

    it('uses the gruntfile editor of the Env if available', function () {
      this.gruntGenerator.env.gruntfile = 'foo';
      assert.equal(this.gruntGenerator.gruntfile, 'foo');
    });

    it('schedule gruntfile writing on the write Queue', function (done) {
      this.gruntGenerator.run(function () {
        var gruntfile = this.dummy.fs.read(this.dummy.destinationPath('Gruntfile.js'));
        assert(gruntfile.indexOf('foo:') > 0);
        done();
      }.bind(this));
    });
  });

  describe('#templatePath()', function () {
    it('joins path to the source root', function () {
      assert.equal(
        this.dummy.templatePath('bar.js'),
        path.join(this.dummy.sourceRoot(), 'bar.js')
      );
      assert.equal(
        this.dummy.templatePath('dir/', 'bar.js'),
        path.join(this.dummy.sourceRoot(), '/dir/bar.js')
      );
    });
  });

  describe('#destinationPath()', function () {
    it('joins path to the source root', function () {
      assert.equal(
        this.dummy.destinationPath('bar.js'),
        path.join(this.dummy.destinationRoot(), 'bar.js')
      );
      assert.equal(
        this.dummy.destinationPath('dir/', 'bar.js'),
        path.join(this.dummy.destinationRoot(), '/dir/bar.js')
      );
    });
  });

  describe('#registerTransformStream()', function () {
    beforeEach(function () {
      this.filepath = path.join(os.tmpdir(), '/yeoman-transform-stream/filea.txt');
      this.TestGenerator = generators.Base.extend({
        exec: sinon.spy()
      });
      this.testGen = new this.TestGenerator([], {
        resolved: 'generator-ember/all/index.js',
        namespace: 'dummy',
        env: this.env
      });
    });

    afterEach(function (done) {
      rimraf(this.filepath, done);
    });

    it('add the transform stream to the commit stream', function (done) {
      var self = this;
      this.TestGenerator.prototype.writing = function () {
        this.fs.write(self.filepath, 'not correct');

        this
          .registerTransformStream(through.obj(function (file, enc, cb) {
            file.contents = new Buffer('a');
            cb(null, file);
          }))
          .registerTransformStream(through.obj(function (file, enc, cb) {
            file.contents = new Buffer(file.contents.toString() + 'b');
            cb(null, file);
          }));
      };

      this.testGen.run(function () {
        assert.equal(fs.readFileSync(this.filepath, 'utf8'), 'ab');
        done();
      }.bind(this));
    });

    it('add multiple transform streams to the commit stream', function (done) {
      var self = this;
      this.TestGenerator.prototype.writing = function () {
        this.fs.write(self.filepath, 'not correct');

        this.registerTransformStream([
          through.obj(function (file, enc, cb) {
            file.contents = new Buffer('a');
            cb(null, file);
          }),
          through.obj(function (file, enc, cb) {
            file.contents = new Buffer(file.contents.toString() + 'b');
            cb(null, file);
          })
        ]);
      };

      this.testGen.run(function () {
        assert.equal(fs.readFileSync(this.filepath, 'utf8'), 'ab');
        done();
      }.bind(this));
    });
  });

  describe('Events', function () {
    before(function () {
      var Generator = this.Generator = function () {
        generators.Base.apply(this, arguments);
      };

      Generator.namespace = 'angular:app';
      util.inherits(Generator, generators.Base);

      Generator.prototype.createSomething = function () {};
      Generator.prototype.createSomethingElse = function () {};
    });

    it('emits the series of event on a specific generator', function (done) {
      var angular = new this.Generator([], {
        env: yeoman.createEnv([], {}, new TestAdapter()),
        resolved: __filename,
        'skip-install': true
      });

      var lifecycle = ['run', 'method:createSomething', 'method:createSomethingElse', 'end'];

      function assertEvent(e) {
        return function () {
          assert.equal(e, lifecycle.shift());

          if (e === 'end') {
            done();
            return;
          }
        };
      }

      angular
        // Run event, emitted right before running the generator.
        .on('run', assertEvent('run'))
        // End event, emitted after the generation process, when every generator
        // methods are executed (hooks are executed after)
        .on('end', assertEvent('end'))
        .on('method:createSomething', assertEvent('method:createSomething'))
        .on('method:createSomethingElse', assertEvent('method:createSomethingElse'));

      angular.run();
    });

    it('only call the end event once (bug #402)', function (done) {
      function GeneratorOnce() {
        generators.Base.apply(this, arguments);
        this.sourceRoot(path.join(__dirname, 'fixtures'));
        this.destinationRoot(path.join(os.tmpdir(), 'yeoman-base-once'));
      }

      util.inherits(GeneratorOnce, generators.Base);

      GeneratorOnce.prototype.createDuplicate = function () {
        this.copy('foo-copy.js');
        this.copy('foo-copy.js');
      };

      var isFirstEndEvent = true;
      var generatorOnce = new GeneratorOnce([], {
        env: yeoman.createEnv([], {}, new TestAdapter()),
        resolved: __filename,
        'skip-install': true
      });

      generatorOnce.on('end', function () {
        assert.ok(isFirstEndEvent);

        if (isFirstEndEvent) {
          done();
        }

        isFirstEndEvent = false;
      });

      generatorOnce.run();
    });

    it('triggers end event after all generators methods are ran (#709)', function (done) {
      var endSpy = sinon.spy();
      var GeneratorEnd = generators.Base.extend({
        constructor: function () {
          generators.Base.apply(this, arguments);
          this.on('end', function () {
            sinon.assert.calledOnce(endSpy);
            done();
          });
        },

        end: endSpy
      });

      var generatorEnd = new GeneratorEnd([], {
        env: yeoman.createEnv([], {}, new TestAdapter()),
        resolved: __filename,
        'skip-install': true
      });

      generatorEnd.run();
    });
  });

  describe('#rootGeneratorName', function () {
    afterEach(function () {
      rimraf.sync(path.join(resolveddir, 'package.json'));
    });

    it('returns the default name', function () {
      assert.equal(this.dummy.rootGeneratorName(), '*');
    });

    it('returns generator name', function () {
      fs.writeFileSync(path.join(resolveddir, 'package.json'), '{ "name": "generator-name" }');
      assert.equal(this.dummy.rootGeneratorName(), 'generator-name');
    });
  });

  describe('#rootGeneratorVersion', function () {
    afterEach(function () {
      rimraf.sync(path.join(resolveddir, 'package.json'));
    });

    it('returns the default version', function () {
      assert.equal(this.dummy.rootGeneratorVersion(), '0.0.0');
    });

    it('returns generator version', function () {
      fs.writeFileSync(path.join(resolveddir, 'package.json'), '{ "version": "1.0.0" }');
      assert.equal(this.dummy.rootGeneratorVersion(), '1.0.0');
    });
  });
});
