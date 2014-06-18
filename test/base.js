/*global describe, before, beforeEach, after, afterEach, it */
'use strict';
var fs = require('fs');
var path = require('path');
var sinon = require('sinon');
var mockery = require('mockery');
mockery.enable({
  warnOnReplace: false,
  warnOnUnregistered: false
});
var generators = require('..');
var yo = generators;
var helpers = generators.test;
var assert = generators.assert;

var Base = generators.generators.Base;

describe('yeoman.generators.Base', function () {
  before(helpers.setUpTestDirectory(path.join(__dirname, 'temp.dev')));

  beforeEach(function () {
    var env = this.env = generators([], { 'skip-install': true });

    var Dummy = this.Dummy = helpers.createDummyGenerator();

    env.registerStub(Dummy, 'ember:all');
    env.registerStub(Dummy, 'hook1:ember');
    env.registerStub(Dummy, 'hook2:ember:all');
    env.registerStub(Dummy, 'hook3');
    env.registerStub(function () {
      this.write(path.join(__dirname, 'temp.dev/app/scripts/models/application-model.js'), '// ...');
    }, 'hook4');

    this.dummy = new Dummy(['bar', 'baz', 'bom'], {
      foo: false,
      something: 'else',
      // mandatory options, created by the env#create() helper
      resolved: 'ember:all',
      namespace: 'dummy',
      env: env,
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
      new this.Dummy(['foo'], {
        resolved: 'ember/all',
        env: this.env
      });
      assert.equal(process.cwd(), projectDir);
    });

    it('use the environment options', function () {
      this.env.registerStub(function () {}, 'ember:model');
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
  });

  describe('prototype', function () {
    it('methods does\'nt conflict with Env#runQueue', function () {
      assert.notImplement(Base.prototype, this.env.runLoop.queueNames);
    });
  });

  describe('#appname', function () {
    it('is set to the `determineAppname()` return value', function () {
      assert.equal(this.dummy.appname, this.dummy.determineAppname());
    });
  });

  describe('#determineAppname()', function () {
    before(function () {
      process.chdir(path.join(__dirname, 'temp.dev'));
    });

    afterEach(function () {
      yo.file.delete('bower.json');
      yo.file.delete('package.json');
      delete require.cache[path.join(process.cwd(), 'bower.json')];
      delete require.cache[path.join(process.cwd(), 'package.json')];
    });

    it('returns appname from bower.json', function () {
      fs.writeFileSync('bower.json', '{ "name": "app-name" }');
      assert.equal(this.dummy.determineAppname(), 'app name');
    });

    it('returns appname from package.json', function () {
      fs.writeFileSync('package.json', '{ "name": "package_app-name" }');
      assert.equal(this.dummy.determineAppname(), 'package_app name');
    });

    it('returns appname from the current directory', function () {
      assert.equal(this.dummy.determineAppname(), 'temp dev');
    });
  });

  describe('.extend()', function () {
    it('create a new object inheriting the Generator', function () {
      assert.ok(new (Base.extend())([], { resolved: 'path/', env: this.env }) instanceof Base);
    });

    it('pass the extend method along', function () {
      var Sub = Base.extend();
      assert.ok(Sub.extend);
    });

    it('assign prototype methods', function () {
      var proto = { foo: function () {}};
      var Sub = Base.extend(proto);
      assert.equal(Sub.prototype.foo, proto.foo);
    });

    it('assign static methods', function () {
      var staticProps = { foo: function () {}};
      var Sub = Base.extend({}, staticProps);
      assert.equal(Sub.foo, staticProps.foo);
    });
  });

  describe('#run()', function () {
    beforeEach(function () {
      this.TestGenerator = helpers.createDummyGenerator();
      this.execSpy = this.TestGenerator.prototype.exec = sinon.spy();
      this.TestGenerator.prototype.exec2 = sinon.spy();
      this.TestGenerator.prototype.exec3 = sinon.spy();
      this.TestGenerator.prototype._private = sinon.spy();
      this.TestGenerator.prototype.prompting = {
        m1: sinon.spy(),
        m2: sinon.spy(),
        _private: sinon.spy(),
        prop: 'foo'
      };
      this.TestGenerator.prototype.initializing = sinon.spy();
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

    it('pass an array of arguments to the called methods', function (done) {
      this.testGen.run(['some', 'args'], function () {
        assert(this.execSpy.withArgs('some', 'args').calledOnce);
        done();
      }.bind(this));
    });

    it('pass string of arguments to the called methods', function (done) {
      this.testGen.run('some args', function () {
        assert(this.execSpy.withArgs('some', 'args').calledOnce);
        done();
      }.bind(this));
    });

    it('pass instance .args property to the called methods', function (done) {
      this.testGen.args = ['2', 'args'];
      this.testGen.run(function () {
        assert(this.execSpy.withArgs('2', 'args').calledOnce);
        done();
      }.bind(this));
    });

    it('resolve conflicts after it ran', function (done) {
      this.testGen.run({}, function () {
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

    it('run methods in series', function (done) {
      var async1Running = false;
      var async1Runned = false;
      this.TestGenerator.prototype.async1 = function () {
        async1Running = true;
        var done = this.async();
        setTimeout(function () {
          async1Running = false;
          async1Runned = true;
          done();
        }, 10);
      };
      this.TestGenerator.prototype.async2 = function () {
        assert(!async1Running);
        assert(async1Runned);
        done();
      };
      this.testGen.run();
    });

    it('throws if no method is available', function () {
      var gen = new (yo.generators.Base.extend())([], {
        resolved: 'generator-ember/all/index.js',
        namespace: 'dummy',
        env: this.env
      });
      assert.throws(gen.run.bind(gen));
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
      }.bind(this));
    });

    it('run queued methods in order even if not in order in prototype', function (done) {
      var initSpy = this.TestGenerator.prototype.initializing;
      var execSpy = this.TestGenerator.prototype.exec;
      this.testGen.run(function () {
        assert(initSpy.calledBefore(execSpy));
        done();
      }.bind(this));
    });
  });

  describe('#_', function () {
    it('expose the Underscore String API', function () {
      assert.implement(this.dummy._, require('underscore.string').exports());
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
        defaults: undefined,
        hide: false
      });
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
        defaults: 'else',
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
      this.GenCompose = yo.generators.Base.extend({ exec: this.spy });
      this.env.registerStub(this.GenCompose, 'composed:gen');
    });

    it('runs the composed generators', function (done) {
      this.dummy.composeWith('composed:gen');
      var runSpy = sinon.spy(this.dummy, 'run');
      // I use a setTimeout here just to make sure composeWith() doesn't start the
      // generator before the base one is runned.
      setTimeout(function () {
        this.dummy.run(function () {
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
        this.stubPath = path.join(__dirname, 'generator-dumb/main.js');
        this.LocalDummy = yo.generators.Base.extend({ exec: this.spy });
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
          assert.equal(this.spy.firstCall.thisValue.options.resolved, this.stubPath);
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
        '-h, --help # Print generator\'s options and usage',
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

  describe('#shell', function () {
    it('extend shelljs module', function () {
      assert.implement(this.dummy.shell, require('shelljs'));
    });
  });

  describe('#config', function () {
    it('provide a storage instance', function () {
      assert.ok(this.dummy.config instanceof require('../lib/util/storage'));
    });

    it('is updated when destinationRoot change', function () {
      sinon.spy(this.Dummy.prototype, '_setStorage');
      this.dummy.destinationRoot('foo');
      assert.equal(this.Dummy.prototype._setStorage.callCount, 1);
      this.dummy.destinationRoot();
      assert.equal(this.Dummy.prototype._setStorage.callCount, 1);
      this.dummy.destinationRoot('foo');
      assert.equal(this.Dummy.prototype._setStorage.callCount, 2);
      this.Dummy.prototype._setStorage.restore();
    });
  });

  describe('#gruntfile', function () {
    beforeEach(function () {
      this.dummy = new this.Dummy([], {
        resolved: 'unknown',
        namespace: 'dummy',
        env: this.env,
        'skip-install': true
      });
    });

    it('expose the gruntfile editor API', function () {
      assert(this.dummy.gruntfile instanceof require('gruntfile-editor'));
    });

    it('uses the gruntfile editor of the Env if available', function () {
      this.dummy.env.gruntfile = 'foo';
      assert.equal(this.dummy.gruntfile, 'foo');
    });

    it('schedule gruntfile writing on the write Queue', function (done) {
      this.Dummy.prototype.grunt = function () {
        this.dest.delete('Gruntfile.js', { force: true });
        this.gruntfile.insertConfig('foo', '{}');
      };
      this.dummy.run(function () {
        var gruntfile = this.dummy.dest.read('Gruntfile.js');
        assert(gruntfile.indexOf('foo:') > 0);
        done();
      }.bind(this));
    });
  });

});
