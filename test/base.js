'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const _ = require('lodash');
const sinon = require('sinon');
const makeDir = require('make-dir');
const mockery = require('mockery');
const rimraf = require('rimraf');
const through = require('through2');
const yeoman = require('yeoman-environment');

mockery.enable({
  warnOnReplace: false,
  warnOnUnregistered: false
});

const assert = require('yeoman-assert');
const helpers = require('yeoman-test');
const {TestAdapter} = require('yeoman-test/lib/adapter');
const Base = require('..');

const tmpdir = path.join(os.tmpdir(), 'yeoman-base');
const resolveddir = path.join(os.tmpdir(), 'yeoman-base-generator');

describe('Base', () => {
  beforeEach(helpers.setUpTestDirectory(tmpdir));

  beforeEach(function () {
    this.env = yeoman.createEnv([], {'skip-install': true}, new TestAdapter());
    // Ignore error forwarded to environment
    this.env.on('error', (_) => {});

    makeDir.sync(resolveddir);
    this.Dummy = class extends Base {};
    this.Dummy.prototype.exec = sinon.spy();

    this.dummy = new this.Dummy(['bar', 'baz', 'bom'], {
      foo: false,
      something: 'else',
      // Mandatory options, created by the `env#create()` helper
      resolved: resolveddir,
      namespace: 'dummy',
      env: this.env,
      'skip-install': true
    });
  });

  describe('constructor', () => {
    it('uses the destinationRoot passed at options', function () {
      const projectDir = path.join(__dirname, 'fixtures/dummy-project');
      const subdir = path.join(projectDir, 'subdir');
      process.chdir(subdir);
      this.env.cwd = process.cwd();

      const dummy = new this.Dummy(['foo'], {
        resolved: 'ember/all',
        env: this.env,
        destinationRoot: subdir
      });

      assert.equal(process.cwd(), subdir);
      assert.equal(dummy.destinationPath(), subdir);
      assert.equal(dummy.contextRoot, subdir);
    });

    it('use the environment options', function () {
      this.env.registerStub(class extends Base {}, 'ember:model');

      const generator = this.env.create('ember:model', {
        options: {
          'test-framework': 'jasmine'
        }
      });

      assert.equal(generator.options['test-framework'], 'jasmine');
    });

    it('set generator.options from constructor options', function () {
      const generator = new Base({
        env: this.env,
        resolved: 'test',
        'test-framework': 'mocha'
      });

      assert.equal(generator.options['test-framework'], 'mocha');
    });

    it('set options based on nopt arguments', function () {
      const generator = new Base(['--foo', 'bar'], {
        env: this.env,
        resolved: 'test'
      });

      generator.option('foo');
      assert.equal(generator.options.foo, true);
      assert.deepEqual(generator.args, ['bar']);
    });

    it('set arguments based on nopt arguments', function () {
      const generator = new Base(['--foo', 'bar'], {
        env: this.env,
        resolved: 'test'
      });

      generator.option('foo');
      generator.argument('baz');
      assert.equal(generator.options.baz, 'bar');
    });

    it('set options with false values', () => {
      return helpers
        .create(
          path.join(__dirname, './fixtures/options-generator'),
          {namespace: 'options-generator'},
          {createEnv: yeoman.createEnv}
        )
        .withOptions({testOption: false})
        .run()
        .then((runResult) => {
          assert.equal(runResult.env.rootGenerator().options.testOption, false);
        });
    });

    it('setup fs editor', function () {
      const generator = new Base([], {
        env: this.env,
        resolved: 'test'
      });

      assert(generator.fs);
    });
  });

  describe('prototype', () => {
    it("methods doesn't conflict with Env#runQueue", function () {
      assert.notImplement(Base.prototype, this.env.runLoop.queueNames);
    });
  });

  describe('#appname', () => {
    it('is set to the `determineAppname()` return value', function () {
      assert.equal(this.dummy.appname, this.dummy.determineAppname());
    });
  });

  describe('#determineAppname()', () => {
    beforeEach(() => {
      process.chdir(tmpdir);
    });

    afterEach(() => {
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

  describe('#run()', () => {
    beforeEach(function () {
      this.TestGenerator = class extends Base {};
      _.extend(this.TestGenerator.prototype, {
        exec: sinon.spy(),
        exec2: sinon.spy(),
        exec3: sinon.spy(),
        _private: sinon.spy(),
        '#composed': sinon.spy(),
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
    });

    it('run all methods in the given generator', function () {
      return this.testGen.run();
    });

    it('turn on _running flag', function () {
      this.testGen.queueTasks();
      assert.ok(this.testGen._running);
    });

    it('run prototype methods (not instances one)', function () {
      this.testGen.exec = sinon.spy();
      return this.testGen.run().then(() => {
        assert.ok(this.execSpy.calledOnce);
        assert.equal(this.testGen.exec.callCount, 0);
      });
    });

    it("don't try running prototype attributes", function () {
      this.TestGenerator.prototype.prop = 'something';
      return this.testGen.run();
    });

    it('pass instance .args property to the called methods', function () {
      this.testGen.args = ['2', 'args'];
      return this.testGen.run().then(() => {
        assert(this.execSpy.withArgs('2', 'args').calledOnce);
      });
    });

    it('can emit error from async methods', function (done) {
      this.TestGenerator.prototype.throwing = function () {
        this.async()('some error');
      };

      this.testGen.env.on('error', (error) => {
        assert.equal(error, 'some error');
        done();
      });

      this.testGen.run().catch(() => {});
    });

    it('can emit error from sync methods', function (done) {
      const error = new Error('Some error');

      this.TestGenerator.prototype.throwing = () => {
        throw error;
      };

      this.testGen.env.on('error', (error_) => {
        assert.equal(error_, error);
        done();
      });

      this.testGen.run().catch(() => {});
    });

    it('stop queue processing once an error is thrown', function () {
      const error = new Error('Some error');
      const spy = sinon.spy();

      this.TestGenerator.prototype.throwing = () => {
        throw error;
      };

      this.TestGenerator.prototype.afterError = spy;

      this.testGen.on('error', sinon.spy());
      return this.testGen.run().catch((error_) => {
        assert.equal(error_, error);
      });
    });

    it('handle function returning promises as asynchronous', function () {
      const spy1 = sinon.spy();
      const spy2 = sinon.spy();

      this.TestGenerator.prototype.first = () => {
        return new Promise((resolve) => {
          setTimeout(() => {
            spy1();
            resolve();
          }, 10);
        });
      };

      this.TestGenerator.prototype.second = () => {
        spy2();
      };

      return this.testGen.run().then(() => {
        spy1.calledBefore(spy2);
      });
    });

    it('handle failing promises as errors', function (done) {
      this.TestGenerator.prototype.failing = () => {
        return new Promise((resolve, reject) => {
          reject(new Error('some error'));
        });
      };

      this.testGen.env.on('error', (error) => {
        assert.equal(error.message, 'some error');
        done();
      });

      this.testGen.run().catch(() => {});
    });

    it('run methods in series', function (done) {
      let async1Running = false;
      let async1Ran = false;

      this.TestGenerator.prototype.async1 = function () {
        async1Running = true;
        const cb = this.async();

        setTimeout(() => {
          async1Running = false;
          async1Ran = true;
          cb();
        }, 10);
      };

      this.TestGenerator.prototype.async2 = () => {
        assert(!async1Running);
        assert(async1Ran);
        done();
      };

      this.testGen.run();
    });

    it('throws if no method is available', function () {
      const gen = new (class extends Base {})([], {
        resolved: 'generator-ember/all/index.js',
        namespace: 'dummy',
        env: this.env
      });

      return gen.run().catch((error) => {
        assert(error.toString().includes('This Generator is empty'));
      });
    });

    it('will run non-enumerable methods', function () {
      class Generator extends Base {}

      Object.defineProperty(Generator.prototype, 'nonenumerable', {
        value: sinon.spy(),
        configurable: true,
        writable: true
      });

      const gen = new Generator([], {
        resolved: 'dummy',
        namespace: 'dummy',
        env: this.env
      });

      return gen.run().then(() => {
        assert(gen.nonenumerable.called);
      });
    });

    it('ignore underscore prefixed method', function () {
      return this.testGen.run().then(() => {
        assert(this.TestGenerator.prototype._private.notCalled);
      });
    });

    it('ignore hashtag prefixed method', function () {
      return this.testGen.run().then(() => {
        assert(this.TestGenerator.prototype['#composed'].notCalled);
      });
    });

    it('run methods in a queue hash', function () {
      return this.testGen.run().then(() => {
        assert(this.TestGenerator.prototype.prompting.m1.calledOnce);
        assert(this.TestGenerator.prototype.prompting.m2.calledOnce);
      });
    });

    it('ignore underscore prefixed method in a queue hash', function () {
      return this.testGen.run().then(() => {
        assert(this.TestGenerator.prototype.prompting._private.notCalled);
      });
    });

    it('run named queued methods in order', function () {
      const initSpy = this.TestGenerator.prototype.initializing;
      const promptSpy = this.TestGenerator.prototype.prompting.m1;

      return this.testGen.run().then(() => {
        assert(initSpy.calledBefore(promptSpy));
      });
    });

    it('run queued methods in order even if not in order in prototype', function () {
      const initSpy = this.TestGenerator.prototype.initializing;
      const execSpy = this.TestGenerator.prototype.exec;

      return this.testGen.run().then(() => {
        assert(initSpy.calledBefore(execSpy));
      });
    });

    it('commit mem-fs to disk', function () {
      let filepath;

      this.TestGenerator.prototype.writing = function () {
        this.fs.write(
          (filepath = path.join(this.destinationRoot(), 'fromfs.txt')),
          'generated'
        );
      };

      return this.testGen.run().then(() => {
        assert(fs.existsSync(filepath));
      });
    });

    it('allow skipping file writes to disk', function () {
      const action = {action: 'skip'};
      const filepath = path.join(__dirname, '/fixtures/conflict.js');
      assert(fs.existsSync(filepath));

      this.TestGenerator.prototype.writing = function () {
        this.fs.write(filepath, 'some new content');
      };

      const env = yeoman.createEnv(
        [],
        {'skip-install': true},
        new TestAdapter(action)
      );
      const testGen = new this.TestGenerator([], {
        resolved: 'generator/app/index.js',
        namespace: 'dummy',
        env
      });

      return testGen.run().then(() => {
        assert.equal(fs.readFileSync(filepath, 'utf8'), 'var a = 1;\n');
      });
    });

    it('allows file writes in any priorities', function () {
      this.TestGenerator.prototype.end = function () {
        this.fs.write(this.destinationPath('foo.txt'), 'test');
      };

      return this.testGen.run().then(() => {
        assert(fs.existsSync(this.testGen.destinationPath('foo.txt')));
      });
    });

    it('can cancel cancellable tasks', function (done) {
      this.TestGenerator.prototype.cancel = function () {
        this.cancelCancellableTasks();
      };

      this.TestGenerator.prototype.throwing = () => {
        throw new Error('not thrown');
      };

      this.testGen.run().then(done);
    });

    it('can start over the generator', function (done) {
      const spy1 = sinon.spy();
      const spy2 = sinon.spy();

      this.TestGenerator.prototype.cancel = function () {
        spy1();
        if (!this.startedOver) {
          this.startOver({startedOver: true});
          this.startedOver = true;
        }
      };

      this.TestGenerator.prototype.after = function () {
        assert(this.options.startedOver);
        assert(this.startedOver);
        spy2();
      };

      this.testGen.run().then(() => {
        assert(spy1.calledTwice);
        assert(spy2.calledOnce);
        done();
      });
    });

    it('can queue a method again', function (done) {
      const spy1 = sinon.spy();

      this.TestGenerator.prototype.cancel = function () {
        spy1();
        if (!this.startedOver) {
          this.queueOwnTask('cancel');
          this.startOver();
          this.startedOver = true;
        }
      };

      this.testGen.run().then(() => {
        assert(spy1.calledTwice);
        done();
      });
    });
  });

  describe('#argument()', () => {
    it('add a new argument to the generator instance', function () {
      assert.equal(this.dummy._arguments.length, 0);
      this.dummy.argument('foo');
      assert.equal(this.dummy._arguments.length, 1);
    });

    it('create the property specified with value from positional args', function () {
      this.dummy.argument('foo');
      assert.equal(this.dummy.options.foo, 'bar');
    });

    it('allows specifying default argument values', function () {
      const Generator = class extends Base {
        constructor(args, options) {
          super(args, options);

          this.argument('bar', {default: 'baz'});
        }
      };

      const gen = new Generator({
        env: this.env,
        resolved: 'test'
      });

      assert.equal(gen.options.bar, 'baz');
    });

    it('allows specifying default argument values', function () {
      const Generator = class extends Base {
        constructor(args, options) {
          super(args, options);

          this.argument('bar', {default: 'baz'});
        }
      };

      const gen = new Generator({
        env: this.env,
        resolved: 'test'
      });

      assert.equal(gen.options.bar, 'baz');
    });

    it('properly uses arguments values passed from constructor', function () {
      const Generator = class extends Base {
        constructor(args, options) {
          super(args, options);

          this.argument('bar', {default: 'baz'});
        }
      };

      const gen = new Generator({
        env: this.env,
        resolved: 'test',
        bar: 'foo'
      });

      assert.equal(gen.options.bar, 'foo');
    });

    it('slice positional arguments when config.type is Array', function () {
      this.dummy.argument('bar', {type: Array});
      assert.deepEqual(this.dummy.options.bar, ['bar', 'baz', 'bom']);
    });

    it('raise an error if required arguments are not provided', function (done) {
      const dummy = new Base([], {
        env: this.env,
        resolved: 'dummy/all'
      });

      try {
        dummy.argument('foo', {required: true});
      } catch (error) {
        assert(error.message.startsWith('Did not provide required argument '));
        done();
      }
    });

    it("doesn't raise an error if required arguments are not provided, but the help option has been specified", function () {
      const dummy = new Base([], {
        env: this.env,
        resolved: 'dummy:all',
        help: true
      });

      assert.equal(dummy._arguments.length, 0);
      assert.doesNotThrow(dummy.argument.bind(dummy, 'foo', {required: true}));
      assert.equal(dummy._arguments.length, 1);
    });

    it('can be called before #option()', function () {
      const dummy = new Base(['--foo', 'bar', 'baz'], {
        env: this.env,
        resolved: 'dummy/all'
      });

      dummy.argument('baz');
      dummy.option('foo', {type: String});

      assert.equal(dummy.options.baz, 'baz');
    });
  });

  describe('#option()', () => {
    it('add a new option to the set of generator expected options', function () {
      // Every generator have the --help options
      const generator = new this.Dummy([], {
        env: this.env,
        resolved: 'test'
      });

      generator.option('foo');
      assert.deepEqual(generator._options.foo, {
        description: 'Description for foo',
        name: 'foo',
        type: Boolean,
        hide: false
      });
    });

    it('allow aliasing options', function () {
      const Generator = class extends Base {
        constructor(args, options) {
          super(args, options);

          this.option('long-name', {
            alias: 'short-name',
            type: String
          });
        }
      };

      const gen = new Generator({
        env: this.env,
        resolved: 'test',
        'short-name': 'that value'
      });

      assert.equal(gen.options['long-name'], 'that value');
    });

    it('allows Boolean options to be undefined', function () {
      const Generator = class extends Base {
        constructor(args, options) {
          super(args, options);

          this.option('undef', {type: Boolean});
        }
      };

      const gen = new Generator({
        env: this.env,
        resolved: 'test'
      });

      assert.equal(gen.options.undef, undefined);
    });

    it('disallows Boolean options starting with no-', function () {
      const generator = new this.Dummy([], {
        env: this.env,
        resolved: 'test'
      });
      const addWrongOp = () => {
        generator.option('no-op');
      };

      assert.throws(addWrongOp, /this\.option\('op', {type: Boolean}\)/);
    });
  });

  describe('#registerConfigPrompts()', () => {
    it('adds an prompt with common definitions', function () {
      this.dummy.registerConfigPrompts({
        name: 'foo',
        message: 'bar',
        type: 'number',
        prompt: true
      });
      assert.equal(this.dummy._prompts[0].name, 'foo');
      assert.equal(this.dummy._prompts[0].message, 'bar');
      assert.equal(this.dummy._prompts[0].type, 'number');
    });

    it('should export option', function () {
      this.dummy.registerConfigPrompts({
        name: 'foo',
        message: 'bar2',
        type: 'string',
        exportOption: true
      });
      assert.equal(this.dummy._prompts[0].name, 'foo');
      assert.equal(this.dummy._prompts[0].message, 'bar2');
      assert.equal(this.dummy._prompts[0].type, 'string');
      assert.equal(this.dummy._options.foo.name, 'foo');
      assert.equal(this.dummy._options.foo.description, 'bar2');
      assert.equal(this.dummy._options.foo.type, String);
    });

    it('allows to customize option config', function () {
      this.dummy.registerConfigPrompts({
        name: 'foo',
        message: 'bar2',
        type: 'string',
        exportOption: {
          description: 'bar3',
          name: 'foo2',
          type: Number
        }
      });
      assert.equal(this.dummy._prompts[0].name, 'foo');
      assert.equal(this.dummy._prompts[0].message, 'bar2');
      assert.equal(this.dummy._prompts[0].type, 'string');
      assert.equal(this.dummy._options.foo2.name, 'foo2');
      assert.equal(this.dummy._options.foo2.description, 'bar3');
      assert.equal(this.dummy._options.foo2.type, Number);
    });
  });

  describe('#parseOptions()', () => {
    beforeEach(function () {
      this.dummy = new this.Dummy(
        ['start', '--foo', 'bar', '-s', 'baz', 'remain'],
        {
          env: this.env,
          resolved: 'test'
        }
      );

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
      const dummy = new this.Dummy({
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

  describe('#composeWith()', () => {
    beforeEach(function () {
      this.dummy = new this.Dummy([], {
        resolved: 'unknown',
        namespace: 'dummy',
        env: this.env,
        'skip-install': true,
        'force-install': true,
        'skip-cache': true
      });

      this.spy = sinon.spy();
      this.GenCompose = class extends Base {};
      this.GenCompose.prototype.exec = this.spy;
      this.env.registerStub(this.GenCompose, 'composed:gen');
    });

    it('returns the composed generator when pass true', function () {
      assert(
        this.dummy.composeWith('composed:gen', true) instanceof this.GenCompose
      );
    });

    it('runs the composed generators', function (done) {
      this.dummy.composeWith('composed:gen');

      const runSpy = sinon.spy(this.dummy, 'run');

      // I use a setTimeout here just to make sure composeWith() doesn't start the
      // generator before the base one is ran.
      setTimeout(() => {
        this.dummy.run().then(() => {
          sinon.assert.callOrder(runSpy, this.spy);
          assert(this.spy.calledAfter(runSpy));
          done();
        });
      }, 100);
    });

    it('runs the composed Generator class in the passed path', function () {
      this.stubPath = path.join(__dirname, 'fixtures/generator-mocha');

      this.dummy.composeWith({
        Generator: this.GenCompose,
        path: this.stubPath
      });

      return this.dummy.run().then(() => {
        assert.equal(this.spy.firstCall.thisValue.options.namespace, 'mocha');
        assert.equal(
          this.spy.firstCall.thisValue.options.resolved,
          require.resolve(this.stubPath)
        );
      });
    });

    describe('object as first argument', () => {
      it('fails for missing Generator property', function () {
        const gen = this.dummy;
        assert.throws(
          () =>
            gen.composeWith({
              path: 'foo-path'
            }),
          (error) => error.message.includes('Missing Generator property')
        );
      });

      it('fails for missing path property', function () {
        const gen = this.dummy;
        assert.throws(
          () =>
            gen.composeWith({
              Generator: this.GenCompose
            }),
          (error) => error.message.includes('path property is not a string')
        );
      });
    });

    it('run the composed generator even if main generator is already running.', function () {
      this.Dummy.prototype.writing = function () {
        this.composeWith('composed:gen');
      };

      return this.dummy.run().then(() => {
        assert(this.spy.called);
      });
    });

    it('pass options and arguments to the composed generators', function () {
      this.dummy.composeWith('composed:gen', {
        foo: 'bar',
        'skip-install': true
      });

      return this.dummy.run().then(() => {
        assert.equal(this.spy.firstCall.thisValue.options.foo, 'bar');
      });
    });

    describe('when passing a local path to a generator', () => {
      beforeEach(function () {
        this.spy = sinon.spy();
        this.stubPath = path.join(__dirname, 'fixtures/generator-mocha');
        this.LocalDummy = class extends Base {};
        this.LocalDummy.prototype.exec = this.spy;
        mockery.registerMock(this.stubPath, this.LocalDummy);
      });

      it('runs the composed generator', function () {
        this.dummy.composeWith(this.stubPath, {});
        return this.dummy.run().then(() => {
          assert(this.LocalDummy.prototype.exec.called);
        });
      });

      it('pass options and arguments to the composed generators', function () {
        this.dummy.composeWith(this.stubPath, {
          foo: 'bar',
          'skip-install': true
        });

        return this.dummy.run().then(() => {
          assert.equal(this.spy.firstCall.thisValue.options.foo, 'bar');
        });
      });

      it('sets correct metadata on the Generator constructor', function () {
        this.dummy.composeWith(this.stubPath, {});
        return this.dummy.run().then(() => {
          assert.equal(this.spy.firstCall.thisValue.options.namespace, 'mocha');
          assert.equal(
            this.spy.firstCall.thisValue.options.resolved,
            require.resolve(this.stubPath)
          );
        });
      });
    });
  });

  describe('#desc()', () => {
    it('update the internal description', function () {
      this.dummy.desc('A new desc for this generator');
      assert.equal(this.dummy.description, 'A new desc for this generator');
    });
  });

  describe('#help()', () => {
    it('return the expected help output', function () {
      this.dummy.option('ooOoo');
      this.dummy.argument('baz', {
        type: Number,
        required: false,
        desc: 'definition; explanation; summary'
      });
      this.dummy.desc('A new desc for this generator');

      const help = this.dummy.help();
      const expected = [
        'Usage:',
        'yo dummy [<baz>] [options]',
        '',
        'A new desc for this generator',
        '',
        'Options:',
        "-h, --help # Print the generator's options and usage",
        '--skip-cache # Do not remember prompt answers Default: false',
        '--skip-install # Do not automatically install dependencies Default: false',
        '--force-install # Fail on install dependencies error Default: false',
        '--ask-answered # Show prompts for already configured options Default: false',
        '--ooOoo # Description for ooOoo',
        '',
        'Arguments:',
        'baz # definition; explanation; summary Type: Number Required: false',
        ''
      ];

      for (const [i, line] of help.split('\n').entries()) {
        // Do not test whitespace; we care about the content, not formatting.
        // formatting is best left up to the tests for module "text-table"
        assert.textEqual(line.trim().replace(/\s+/g, ' '), expected[i]);
      }
    });
  });

  describe('#usage()', () => {
    it('returns the expected usage output with arguments', function () {
      this.dummy.argument('baz', {
        type: Number,
        required: false
      });

      const usage = this.dummy.usage();
      assert.equal(usage.trim(), 'yo dummy [<baz>] [options]');
    });

    it('returns the expected usage output without arguments', function () {
      this.dummy._arguments.length = 0;
      const usage = this.dummy.usage();
      assert.equal(usage.trim(), 'yo dummy [options]');
    });

    it('returns the expected usage output without options', function () {
      this.dummy._arguments.length = 0;
      this.dummy._options = {};
      const usage = this.dummy.usage();
      assert.equal(usage.trim(), 'yo dummy');
    });
  });

  describe('#config', () => {
    it('provide a storage instance', function () {
      assert.ok(this.dummy.config instanceof require('../lib/util/storage'));
    });

    it('is updated when destinationRoot change', function () {
      sinon.spy(this.Dummy.prototype, '_getStorage');
      this.dummy.destinationRoot('foo');
      // eslint-disable-next-line no-unused-expressions
      this.dummy.config;
      assert.equal(this.Dummy.prototype._getStorage.callCount, 1);
      this.dummy.destinationRoot();
      // eslint-disable-next-line no-unused-expressions
      this.dummy.config;
      assert.equal(this.Dummy.prototype._getStorage.callCount, 1);
      this.dummy.destinationRoot('foo');
      // eslint-disable-next-line no-unused-expressions
      this.dummy.config;
      assert.equal(this.Dummy.prototype._getStorage.callCount, 2);
      this.Dummy.prototype._getStorage.restore();
    });
  });

  describe('#templatePath()', () => {
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

  describe('#destinationPath()', () => {
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

  describe('#registerTransformStream()', () => {
    beforeEach(function () {
      this.filepath = path.join(
        os.tmpdir(),
        '/yeoman-transform-stream/filea.txt'
      );
      this.TestGenerator = class extends Base {};
      this.TestGenerator.prototype.exec = sinon.spy();
      this.testGen = new this.TestGenerator([], {
        resolved: 'generator-ember/all/index.js',
        namespace: 'dummy',
        env: this.env
      });
    });

    afterEach(function (done) {
      rimraf(this.filepath, done);
    });

    it('add the transform stream to the commit stream', function () {
      const self = this;
      this.TestGenerator.prototype.writing = function () {
        this.fs.write(self.filepath, 'not correct');

        this.queueTransformStream(
          through.obj((file, enc, cb) => {
            file.contents = Buffer.from('a');
            cb(null, file);
          })
        ).queueTransformStream(
          through.obj((file, enc, cb) => {
            file.contents = Buffer.from(file.contents.toString() + 'b');
            cb(null, file);
          })
        );
      };

      return this.testGen.run().then(() => {
        assert.equal(fs.readFileSync(this.filepath, 'utf8'), 'ab');
      });
    });

    it('add multiple transform streams to the commit stream', function () {
      const self = this;
      this.TestGenerator.prototype.writing = function () {
        this.fs.write(self.filepath, 'not correct');

        this.queueTransformStream([
          through.obj((file, enc, cb) => {
            file.contents = Buffer.from('a');
            cb(null, file);
          }),
          through.obj((file, enc, cb) => {
            file.contents = Buffer.from(file.contents.toString() + 'b');
            cb(null, file);
          })
        ]);
      };

      return this.testGen.run().then(() => {
        assert.equal(fs.readFileSync(this.filepath, 'utf8'), 'ab');
      });
    });
  });

  describe('Events', () => {
    beforeEach(function () {
      class Generator extends Base {}
      this.Generator = Generator;
      Generator.namespace = 'angular:app';
      Generator.prototype.createSomething = () => {};
      Generator.prototype.createSomethingElse = () => {};
    });

    it('emits the series of event on a specific generator', function (done) {
      const angular = new this.Generator([], {
        env: yeoman.createEnv([], {}, new TestAdapter()),
        resolved: __filename,
        'skip-install': true
      });

      const lifecycle = [
        'run',
        'method:createSomething',
        'method:createSomethingElse',
        'end'
      ];

      function assertEvent(error) {
        return function () {
          assert.equal(error, lifecycle.shift());

          if (error === 'end') {
            done();
          }
        };
      }

      angular
        // Run event, emitted right before running the generator.
        .on('run', assertEvent('run'))
        // End event, emitted after the generation process, when every generator
        // methods are executed
        .on('end', assertEvent('end'))
        .on('method:createSomething', assertEvent('method:createSomething'))
        .on(
          'method:createSomethingElse',
          assertEvent('method:createSomethingElse')
        );

      angular.run();
    });

    it('only call the end event once (bug #402)', (done) => {
      class GeneratorOnce extends Base {
        constructor(args, options) {
          super(args, options);
          this.sourceRoot(path.join(__dirname, 'fixtures'));
          this.destinationRoot(path.join(os.tmpdir(), 'yeoman-base-once'));
        }

        createDuplicate() {
          this.fs.copy(
            this.templatePath('foo-copy.js'),
            this.destinationPath('foo-copy.js')
          );
          this.fs.copy(
            this.templatePath('foo-copy.js'),
            this.destinationPath('foo-copy.js')
          );
        }
      }

      let isFirstEndEvent = true;
      const generatorOnce = new GeneratorOnce([], {
        env: yeoman.createEnv([], {}, new TestAdapter()),
        resolved: __filename,
        'skip-install': true
      });

      generatorOnce.on('end', () => {
        assert.ok(isFirstEndEvent);

        if (isFirstEndEvent) {
          done();
        }

        isFirstEndEvent = false;
      });

      generatorOnce.run();
    });

    it('triggers end event after all generators methods are ran (#709)', (done) => {
      const endSpy = sinon.spy();
      const GeneratorEnd = class extends Base {
        constructor(args, options) {
          super(args, options);
          this.on('end', () => {
            sinon.assert.calledOnce(endSpy);
            done();
          });
        }

        end() {
          endSpy();
        }
      };

      const generatorEnd = new GeneratorEnd([], {
        env: yeoman.createEnv([], {}, new TestAdapter()),
        resolved: __filename,
        'skip-install': true
      });

      generatorEnd.run();
    });
  });

  describe('#rootGeneratorName', () => {
    afterEach(() => {
      rimraf.sync(path.join(resolveddir, 'package.json'));
    });

    it('returns the default name', function () {
      assert.equal(this.dummy.rootGeneratorName(), '*');
    });

    it('returns generator name', function () {
      fs.writeFileSync(
        path.join(resolveddir, 'package.json'),
        '{ "name": "generator-name" }'
      );
      assert.equal(this.dummy.rootGeneratorName(), 'generator-name');
    });
  });

  describe('#rootGeneratorVersion', () => {
    afterEach(() => {
      rimraf.sync(path.join(resolveddir, 'package.json'));
    });

    it('returns the default version', function () {
      assert.equal(this.dummy.rootGeneratorVersion(), '0.0.0');
    });

    it('returns generator version', function () {
      fs.writeFileSync(
        path.join(resolveddir, 'package.json'),
        '{ "version": "1.0.0" }'
      );
      assert.equal(this.dummy.rootGeneratorVersion(), '1.0.0');
    });
  });

  describe('#queueMethod()', () => {
    beforeEach(function () {
      this.Generator = class extends Base {
        constructor(args, options) {
          super(args, options);

          this.queueMethod(
            {
              testQueue() {
                this.queue = this.options.testQueue;
              }
            },
            () => {}
          );
        }

        exec() {}
      };
    });

    it('queued method is executed', function (done) {
      const gen = new this.Generator({
        resolved: resolveddir,
        namespace: 'dummy',
        env: this.env,
        testQueue: 'This value'
      });

      gen.run().then(() => {
        assert.equal(gen.queue, 'This value');
        done();
      });
    });

    it('queued method is executed by derived generator', function (done) {
      const Derived = class extends this.Generator {
        constructor(args, options) {
          super(args, options);

          this.prop = 'a';
        }

        // At least a method is required otherwise will fail. Is this a problem?
        exec() {
          assert.equal(this.prop, 'a');
        }

        get initializing() {
          assert.equal(this.prop, 'a');
          return {};
        }
      };

      const derivedGen = new Derived({
        resolved: resolveddir,
        namespace: 'dummy',
        env: this.env,
        testQueue: 'That value'
      });

      derivedGen.run().then(() => {
        assert.equal(derivedGen.queue, 'That value');
        done();
      });
    });

    it('queued method with function, methodName and reject', function () {
      const env = yeoman.createEnv(
        [],
        {'skip-install': true},
        new TestAdapter()
      );
      const gen = new this.Generator({
        resolved: resolveddir,
        namespace: 'dummy',
        env,
        testQueue: 'This value'
      });

      sinon.spy(env.runLoop, 'add');
      const noop = () => {};
      gen.queueMethod(noop, 'configuring', noop);

      assert(env.runLoop.add.calledOnce);
      assert.equal('default', env.runLoop.add.getCall(0).args[0]);
    });

    it('queued method with object, queueName and reject', function () {
      const env = yeoman.createEnv(
        [],
        {'skip-install': true},
        new TestAdapter()
      );
      const gen = new this.Generator({
        resolved: resolveddir,
        namespace: 'dummy',
        env,
        testQueue: 'This value'
      });

      sinon.spy(env.runLoop, 'add');
      const noop = () => {};
      const queueName = 'configuring';
      const tasks = {
        foo() {}
      };
      gen.queueMethod(tasks, queueName, noop);

      assert(env.runLoop.add.calledOnce);
      assert.equal(queueName, env.runLoop.add.getCall(0).args[0]);
    });
  });

  describe('#queueTask()', () => {
    beforeEach(function () {
      this.Generator = class extends Base {
        constructor(args, options) {
          super(args, options);

          this.queueMethod(
            {
              testQueue() {
                this.queue = this.options.testQueue;
              }
            },
            () => {}
          );
        }

        exec() {}
      };
    });

    it('queued method with function and options', function () {
      const env = yeoman.createEnv(
        [],
        {'skip-install': true},
        new TestAdapter()
      );
      const gen = new this.Generator({
        resolved: resolveddir,
        namespace: 'dummy',
        env,
        testQueue: 'This value'
      });

      sinon.spy(env.runLoop, 'add');
      const method = () => {};
      const taskName = 'foo';
      const queueName = 'configuring';
      gen.queueTask({
        method,
        queueName,
        taskName,
        once: true,
        run: false
      });

      assert(env.runLoop.add.calledOnce);
      assert.equal(queueName, env.runLoop.add.getCall(0).args[0]);
      assert.deepStrictEqual(
        {
          once: taskName,
          run: false
        },
        env.runLoop.add.getCall(0).args[2]
      );
    });

    it('queued method with function and options with reject', function () {
      const gen = new this.Generator({
        resolved: resolveddir,
        namespace: 'dummy',
        env: this.env,
        testQueue: 'This value'
      });

      let thrown = false;
      const method = () => {
        thrown = true;
        throw new Error('Some error');
      };

      const taskName = 'foo';
      const queueName = 'configuring';
      gen.queueTask({
        method,
        queueName,
        taskName,
        run: false,
        reject: () => {}
      });

      return gen.run().then(() => {
        assert.equal(thrown, true);
      });
    });
  });

  describe('Custom priorities', () => {
    beforeEach(function () {
      this.TestGenerator = class extends Base {
        constructor(args, options) {
          super(args, {
            ...options,
            customPriorities: [
              ...(options.customPriorities || []),
              {
                // Change priority prompting to be queue before writing for this generator.
                // If we change defaults priorities in the future, the order of custom priorities will keep the same.
                name: 'prompting',
                before: 'writing'
              },
              {
                name: 'prePrompting1',
                before: 'prompting'
              },
              {
                name: 'preConfiguring1',
                before: 'preConfiguring2',
                queueName: 'common#preConfiguring1',
                once: true
              },
              {
                priorityName: 'preConfiguring2',
                before: 'configuring'
              },
              {
                priorityName: 'afterEnd'
              }
            ]
          });
        }
      };
    });

    it('generates correct _queues and runLoop queueNames', function () {
      _.extend(this.TestGenerator.prototype, {
        assert() {
          assert.deepStrictEqual(this._queues, {
            initializing: {
              priorityName: 'initializing',
              queueName: 'initializing'
            },
            preConfiguring1: {
              priorityName: 'preConfiguring1',
              queueName: 'common#preConfiguring1',
              before: 'preConfiguring2',
              once: true
            },
            preConfiguring2: {
              priorityName: 'preConfiguring2',
              queueName: 'dummy#preConfiguring2',
              before: 'configuring'
            },
            configuring: {
              priorityName: 'configuring',
              queueName: 'configuring'
            },
            default: {priorityName: 'default', queueName: 'default'},
            prePrompting1: {
              priorityName: 'prePrompting1',
              queueName: 'dummy#prePrompting1',
              before: 'prompting'
            },
            prompting: {
              priorityName: 'prompting',
              queueName: 'dummy#prompting',
              before: 'writing'
            },
            writing: {priorityName: 'writing', queueName: 'writing'},
            transform: {priorityName: 'transform', queueName: 'transform'},
            conflicts: {priorityName: 'conflicts', queueName: 'conflicts'},
            install: {priorityName: 'install', queueName: 'install'},
            end: {priorityName: 'end', queueName: 'end'},
            afterEnd: {priorityName: 'afterEnd', queueName: 'dummy#afterEnd'}
          });
          assert.deepStrictEqual(this.env.runLoop.queueNames, [
            'environment:run',
            'initializing',
            'prompting',
            'common#preConfiguring1',
            'dummy#preConfiguring2',
            'configuring',
            'default',
            'dummy#prePrompting1',
            'dummy#prompting',
            'writing',
            'transform',
            'conflicts',
            'environment:conflicts',
            'install',
            'end',
            'dummy#afterEnd'
          ]);
        }
      });

      this.testGen = new this.TestGenerator([], {
        resolved: 'generator-ember/all/index.js',
        namespace: 'dummy',
        env: this.env,
        'skip-install': true
      });

      return this.testGen.run();
    });

    it('run custom priorities in correct order', function () {
      const prePrompting1 = sinon.spy();
      const preConfiguring1 = sinon.spy();
      const preConfiguring2 = sinon.spy();
      const afterEnd = sinon.spy();

      const initializing = sinon.spy();
      const prompting = sinon.spy();
      const configuring = sinon.spy();
      const end = sinon.spy();

      _.extend(this.TestGenerator.prototype, {
        prePrompting1,
        preConfiguring1,
        preConfiguring2,
        afterEnd,
        initializing,
        prompting,
        configuring,
        end
      });

      this.testGen = new this.TestGenerator([], {
        resolved: 'generator-ember/all/index.js',
        namespace: 'dummy',
        env: this.env,
        'skip-install': true
      });

      return this.testGen.run().then(() => {
        assert(initializing.calledBefore(preConfiguring1));
        assert(preConfiguring1.calledBefore(preConfiguring2));
        assert(preConfiguring2.calledBefore(configuring));
        assert(configuring.calledBefore(prePrompting1));
        assert(prePrompting1.calledBefore(prompting));
        assert(prompting.calledBefore(end));
        assert(end.calledBefore(afterEnd));
      });
    });

    it('correctly run custom priority with once option', function () {
      const commonPreConfiguring = sinon.spy();
      const customPreConfiguring1 = sinon.spy();
      const customPreConfiguring2 = sinon.spy();

      _.extend(this.TestGenerator.prototype, {
        get preConfiguring1() {
          return {commonPreConfiguring};
        }
      });

      this.TestGenerator2 = class extends this.TestGenerator {
        get preConfiguring1() {
          return {...super.preConfiguring1, customPreConfiguring1};
        }
      };

      this.TestGenerator3 = class extends this.TestGenerator {
        get preConfiguring1() {
          return {...super.preConfiguring1, customPreConfiguring2};
        }
      };

      this.testGen = new this.TestGenerator2([], {
        resolved: 'unknown',
        namespace: 'dummy',
        env: this.env,
        'skip-install': true
      });

      this.testGen.composeWith({
        Generator: this.TestGenerator3,
        path: 'unknown'
      });

      return this.testGen.run().then(() => {
        sinon.assert.calledOnce(commonPreConfiguring);
        sinon.assert.calledOnce(customPreConfiguring1);
        sinon.assert.calledOnce(customPreConfiguring2);
      });
    });
  });

  describe('Custom priorities errors', () => {
    it('error is thrown with duplicate custom queue', function () {
      const TestGenerator = class extends Base {
        constructor(args, options) {
          super(args, {
            ...options,
            customPriorities: [
              {
                name: 'beforePrompting',
                before: 'prompting'
              },
              {
                name: 'beforePrompting',
                before: 'prompting'
              }
            ]
          });
        }
      };

      assert.throws(
        () =>
          new TestGenerator([], {
            resolved: 'generator-ember/all/index.js',
            namespace: 'dummy',
            env: this.env,
            'skip-install': true
          })
      );
    });
  });

  describe('#prompt', () => {
    let promptSpy;
    const input1Prompt = {type: 'input', name: 'prompt1'};
    const input2Prompt = {type: 'input', name: 'prompt2'};
    beforeEach(function () {
      this.dummy.env.adapter = new TestAdapter({
        prompt1: 'prompt1NewValue',
        prompt2: 'prompt2NewValue'
      });
      promptSpy = sinon.spy(this.dummy.env.adapter, 'prompt');
      this.dummy.options.askAnswered = true;
      this.dummy.config.set('prompt1', 'prompt1Value');
      this.dummy.config.set('prompt2', 'prompt2Value');
      this.dummy.config.set('notUsed', 'notUsedValue');
    });
    afterEach(() => {
      promptSpy.restore();
    });

    it('passes config value as answer to adapter', function () {
      const expectedAnswers = {prompt1: 'prompt1Value'};
      return this.dummy.prompt(input1Prompt, this.dummy.config).then((_) => {
        assert.deepEqual(promptSpy.getCall(0).args[1], expectedAnswers);
      });
    });

    it('passes config values as answers to adapter', function () {
      const expectedAnswers = {
        prompt1: 'prompt1Value',
        prompt2: 'prompt2Value'
      };
      return this.dummy
        .prompt([input1Prompt, input2Prompt], this.dummy.config)
        .then((_) => {
          assert.deepEqual(promptSpy.getCall(0).args[1], expectedAnswers);
        });
    });

    it('passes config values as the question default', function () {
      return this.dummy
        .prompt([input1Prompt, input2Prompt], this.dummy.config)
        .then((_) => {
          assert.deepEqual(
            promptSpy.getCall(0).args[0][0].default,
            'prompt1Value'
          );
          assert.deepEqual(
            promptSpy.getCall(0).args[0][1].default,
            'prompt2Value'
          );
        });
    });

    it('saves answers to config', function () {
      return this.dummy
        .prompt([input1Prompt, input2Prompt], this.dummy.config)
        .then((answers) => {
          assert.equal(answers.prompt1, 'prompt1NewValue');
          assert.equal(answers.prompt2, 'prompt2NewValue');
          assert.equal(this.dummy.config.get('prompt1'), 'prompt1NewValue');
          assert.equal(this.dummy.config.get('prompt2'), 'prompt2NewValue');
        });
    });

    it('saves answers to config when specified as a property name', function () {
      return this.dummy
        .prompt([{...input1Prompt, storage: 'config'}, input2Prompt])
        .then((answers) => {
          assert.equal(answers.prompt1, 'prompt1NewValue');
          assert.equal(answers.prompt2, 'prompt2NewValue');
          assert.equal(this.dummy.config.get('prompt1'), 'prompt1NewValue');
          assert.equal(this.dummy.config.get('prompt2'), 'prompt2Value');
        });
    });

    it('saves answers to specific storage', function () {
      return this.dummy
        .prompt([{...input1Prompt, storage: this.dummy.config}, input2Prompt])
        .then((answers) => {
          assert.equal(answers.prompt1, 'prompt1NewValue');
          assert.equal(answers.prompt2, 'prompt2NewValue');
          assert.equal(this.dummy.config.get('prompt1'), 'prompt1NewValue');
          assert.equal(this.dummy.config.get('prompt2'), 'prompt2Value');
        });
    });

    it('passes correct askAnswered option to adapter', function () {
      return this.dummy.prompt([input1Prompt], this.dummy.config).then((_) => {
        assert.deepEqual(promptSpy.getCall(0).args[0][0].askAnswered, true);
      });
    });
  });

  describe('#getFeatures', () => {
    it('should return namespace as uniqueBy when unique is true', function () {
      const gen = new Base([], {unique: true, namespace: 'foo', env: this.env});
      assert.equal(gen.getFeatures().uniqueBy, 'foo');
    });

    it("should return namespace as uniqueBy when unique is 'namespace'", function () {
      const gen = new Base([], {
        unique: 'namespace',
        namespace: 'foo',
        env: this.env
      });
      assert.equal(gen.getFeatures().uniqueBy, 'foo');
    });

    it("should return namespace with first argument as uniqueBy when unique is 'namespace'", function () {
      const gen = new Base(['bar'], {
        unique: 'argument',
        namespace: 'foo',
        env: this.env
      });
      assert.equal(gen.getFeatures().uniqueBy, 'foo#bar');
    });
  });
});
