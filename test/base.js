'use strict';
const fs = require('fs');
const os = require('os');
const LF = require('os').EOL;
const path = require('path');
const _ = require('lodash');
const sinon = require('sinon');
const mkdirp = require('mkdirp');
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
const TestAdapter = require('yeoman-test/lib/adapter').TestAdapter;
const Base = require('..');
const Conflicter = require('../lib/util/conflicter');

const tmpdir = path.join(os.tmpdir(), 'yeoman-base');
const resolveddir = path.join(os.tmpdir(), 'yeoman-base-generator');

describe('Base', () => {
  before(helpers.setUpTestDirectory(tmpdir));

  beforeEach(function () {
    this.env = yeoman.createEnv([], {'skip-install': true}, new TestAdapter());
    mkdirp.sync(resolveddir);
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
    it('set the CWD where `.yo-rc.json` is found', function () {
      const projectDir = path.join(__dirname, 'fixtures/dummy-project');
      const subdir = path.join(projectDir, 'subdir');
      process.chdir(subdir);
      this.env.cwd = process.cwd();

      const dummy = new this.Dummy(['foo'], {
        resolved: 'ember/all',
        env: this.env
      });

      assert.equal(process.cwd(), projectDir);
      assert.equal(dummy.destinationPath(), projectDir);
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

    it('set options with false values', done => {
      const generator = helpers
        .run(path.join(__dirname, './fixtures/options-generator'))
        .withOptions({testOption: false}).on('end', () => {
          assert.equal(generator.options.testOption, false);
          done();
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
    it('methods doesn\'t conflict with Env#runQueue', function () {
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
      this.testGen.run(() => {
        assert.ok(this.execSpy.calledOnce);
        assert.equal(this.testGen.exec.callCount, 0);
        done();
      });
    });

    it('don\'t try running prototype attributes', function (done) {
      this.TestGenerator.prototype.prop = 'something';
      this.testGen.run(done);
    });

    it('pass instance .args property to the called methods', function (done) {
      this.testGen.args = ['2', 'args'];
      this.testGen.run(() => {
        assert(this.execSpy.withArgs('2', 'args').calledOnce);
        done();
      });
    });

    it('resolve conflicts after it ran', function (done) {
      this.testGen.run(() => {
        assert.equal(this.resolveSpy.callCount, 1);
        done();
      });
    });

    it('can emit error from async methods', function (done) {
      this.TestGenerator.prototype.throwing = function () {
        this.async()('some error');
      };

      this.testGen.on('error', err => {
        assert.equal(err, 'some error');
        done();
      });

      this.testGen.run();
    });

    it('can emit error from sync methods', function (done) {
      const error = new Error();

      this.TestGenerator.prototype.throwing = () => {
        throw error;
      };

      this.testGen.on('error', err => {
        assert.equal(err, error);
        done();
      });

      this.testGen.run();
    });

    it('stop queue processing once an error is thrown', function (done) {
      const error = new Error();
      const spy = sinon.spy();

      this.TestGenerator.prototype.throwing = () => {
        throw error;
      };
      this.TestGenerator.prototype.afterError = spy;

      this.testGen.on('error', sinon.spy());
      this.testGen.run(err => {
        assert.equal(err, error);
        done();
      });
    });

    it('handle function returning promises as asynchronous', function (done) {
      const spy1 = sinon.spy();
      const spy2 = sinon.spy();

      this.TestGenerator.prototype.first = () => {
        return new Promise(resolve => {
          setTimeout(() => {
            spy1();
            resolve();
          }, 10);
        });
      };

      this.TestGenerator.prototype.second = () => {
        spy2();
      };

      this.testGen.run(() => {
        spy1.calledBefore(spy2);
        done();
      });
    });

    it('handle failing promises as errors', function (done) {
      this.TestGenerator.prototype.failing = () => {
        return new Promise((resolve, reject) => {
          reject(new Error('some error'));
        });
      };

      this.testGen.on('error', err => {
        assert.equal(err.message, 'some error');
        done();
      });

      this.testGen.run();
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

      assert.throws(gen.run.bind(gen));
    });

    it('will run non-enumerable methods', function (done) {
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

      gen.run(() => {
        assert(gen.nonenumerable.called);
        done();
      });
    });

    it('ignore underscore prefixed method', function (done) {
      this.testGen.run(() => {
        assert(this.TestGenerator.prototype._private.notCalled);
        done();
      });
    });

    it('run methods in a queue hash', function (done) {
      this.testGen.run(() => {
        assert(this.TestGenerator.prototype.prompting.m1.calledOnce);
        assert(this.TestGenerator.prototype.prompting.m2.calledOnce);
        done();
      });
    });

    it('ignore underscore prefixed method in a queue hash', function (done) {
      this.testGen.run(() => {
        assert(this.TestGenerator.prototype.prompting._private.notCalled);
        done();
      });
    });

    it('run named queued methods in order', function (done) {
      const initSpy = this.TestGenerator.prototype.initializing;
      const promptSpy = this.TestGenerator.prototype.prompting.m1;

      this.testGen.run(() => {
        assert(initSpy.calledBefore(promptSpy));
        done();
      });
    });

    it('run queued methods in order even if not in order in prototype', function (done) {
      const initSpy = this.TestGenerator.prototype.initializing;
      const execSpy = this.TestGenerator.prototype.exec;

      this.testGen.run(() => {
        assert(initSpy.calledBefore(execSpy));
        done();
      });
    });

    it('commit mem-fs to disk', function (done) {
      let filepath;

      this.TestGenerator.prototype.writing = function () {
        this.fs.write(
          filepath = path.join(this.destinationRoot(), 'fromfs.txt'),
          'generated'
        );
      };

      this.testGen.run(() => {
        assert(fs.existsSync(filepath));
        done();
      });
    });

    it('allow skipping file writes to disk', function (done) {
      const action = {action: 'skip'};
      const filepath = path.join(__dirname, '/fixtures/conflict.js');
      assert(fs.existsSync(filepath));

      this.TestGenerator.prototype.writing = function () {
        this.fs.write(filepath, 'some new content');
      };

      const env = yeoman.createEnv([], {'skip-install': true}, new TestAdapter(action));
      const testGen = new this.TestGenerator([], {
        resolved: 'generator/app/index.js',
        namespace: 'dummy',
        env
      });

      testGen.run(() => {
        assert.equal(fs.readFileSync(filepath, 'utf8'), 'var a = 1;' + LF);
        done();
      });
    });

    it('does not prompt again for skipped files', function (done) {
      const action = {action: 'skip'};
      const filepath = path.join(__dirname, '/fixtures/conflict.js');
      const filepath2 = path.join(__dirname, '/fixtures/file-conflict.txt');

      sinon.spy(Conflicter.prototype, 'checkForCollision');
      const env = yeoman.createEnv([], {'skip-install': true}, new TestAdapter(action));
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

      const testGen = new this.TestGenerator([], {
        resolved: 'generator/app/index.js',
        namespace: 'dummy',
        env
      });

      testGen.run(() => {
        sinon.assert.calledTwice(Conflicter.prototype.checkForCollision);
        Conflicter.prototype.checkForCollision.restore();
        done();
      });
    });

    it('does not pass config file to conflicter', function (done) {
      this.TestGenerator.prototype.writing = function () {
        fs.writeFileSync(this.destinationPath('.yo-rc.json'), '{"foo": 3}');
        fs.writeFileSync(path.join(os.homedir(), '.yo-rc-global.json'), '{"foo": 3}');
        this.config.set('bar', 1);
        this._globalConfig.set('bar', 1);
      };

      this.testGen.run(done);
    });

    it('allows file writes in any priorities', function (done) {
      this.TestGenerator.prototype.end = function () {
        this.fs.write(this.destinationPath('foo.txt'), 'test');
      };

      this.testGen.run(() => {
        assert(fs.existsSync(this.testGen.destinationPath('foo.txt')));
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
        constructor(args, opts) {
          super(args, opts);

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
        constructor(args, opts) {
          super(args, opts);

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
        constructor(args, opts) {
          super(args, opts);

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
      }).on('error', () => {
        done();
      });

      dummy.argument('foo', {required: true});
    });

    it('doesn\'t raise an error if required arguments are not provided, but the help option has been specified', function () {
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
        constructor(args, opts) {
          super(args, opts);

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
        constructor(args, opts) {
          super(args, opts);

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
      assert.throws(addWrongOp, /this\.option\('op', \{type: Boolean\}\)/);
    });
  });

  describe('#parseOptions()', () => {
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
        skipInstall: true
      });

      this.spy = sinon.spy();
      this.GenCompose = class extends Base {};
      this.GenCompose.prototype.exec = this.spy;
      this.env.registerStub(this.GenCompose, 'composed:gen');
    });

    it('runs the composed generators', function (done) {
      this.dummy.composeWith('composed:gen');
      const runSpy = sinon.spy(this.dummy, 'run');

      // I use a setTimeout here just to make sure composeWith() doesn't start the
      // generator before the base one is ran.
      setTimeout(() => {
        this.dummy.run(() => {
          sinon.assert.callOrder(runSpy, this.spy);
          assert.equal(this.spy.thisValues[0].options.skipInstall, true);
          assert.equal(this.spy.thisValues[0].options['skip-install'], true);
          assert(this.spy.calledAfter(runSpy));
          done();
        });
      }, 100);
    });

    it('run the composed generator even if main generator is already running.', function (done) {
      this.Dummy.prototype.writing = function () {
        this.composeWith('composed:gen');
      };

      this.dummy.run(() => {
        assert(this.spy.called);
        done();
      });
    });

    it('pass options and arguments to the composed generators', function (done) {
      this.dummy.composeWith('composed:gen', {
        foo: 'bar',
        'skip-install': true
      });

      this.dummy.run(() => {
        assert.equal(this.spy.firstCall.thisValue.options.foo, 'bar');
        done();
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

      it('runs the composed generator', function (done) {
        this.dummy.composeWith(this.stubPath, {});
        this.dummy.run(() => {
          assert(this.LocalDummy.prototype.exec.called);
          done();
        });
      });

      it('pass options and arguments to the composed generators', function (done) {
        this.dummy.composeWith(this.stubPath, {foo: 'bar', 'skip-install': true});

        this.dummy.run(() => {
          assert.equal(this.spy.firstCall.thisValue.options.foo, 'bar');
          done();
        });
      });

      it('sets correct metadata on the Generator constructor', function (done) {
        this.dummy.composeWith(this.stubPath, {});
        this.dummy.run(() => {
          assert.equal(this.spy.firstCall.thisValue.options.namespace, 'mocha');
          assert.equal(
            this.spy.firstCall.thisValue.options.resolved,
            require.resolve(this.stubPath)
          );
          done();
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
        'yo dummy [options] [<baz>]',
        '',
        'A new desc for this generator',
        '',
        'Options:',
        '-h, --help # Print the generator\'s options and usage',
        '--skip-cache # Do not remember prompt answers Default: false',
        '--skip-install # Do not automatically install dependencies Default: false',
        '--ooOoo # Description for ooOoo',
        '',
        'Arguments:',
        'baz # definition; explanation; summary Type: Number Required: false',
        ''
      ];

      help.split('\n').forEach((line, i) => {
        // Do not test whitespace; we care about the content, not formatting.
        // formatting is best left up to the tests for module "text-table"
        assert.textEqual(line.trim().replace(/\s+/g, ' '), expected[i]);
      });
    });
  });

  describe('#usage()', () => {
    it('returns the expected usage output with arguments', function () {
      this.dummy.argument('baz', {
        type: Number,
        required: false
      });

      const usage = this.dummy.usage();
      assert.equal(usage.trim(), 'yo dummy [options] [<baz>]');
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
      assert.equal(this.Dummy.prototype._getStorage.callCount, 1);
      this.dummy.destinationRoot();
      assert.equal(this.Dummy.prototype._getStorage.callCount, 1);
      this.dummy.destinationRoot('foo');
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
      this.filepath = path.join(os.tmpdir(), '/yeoman-transform-stream/filea.txt');
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

    it('add the transform stream to the commit stream', function (done) {
      const self = this;
      this.TestGenerator.prototype.writing = function () {
        this.fs.write(self.filepath, 'not correct');

        this
          .registerTransformStream(through.obj((file, enc, cb) => {
            file.contents = Buffer.from('a');
            cb(null, file);
          }))
          .registerTransformStream(through.obj((file, enc, cb) => {
            file.contents = Buffer.from(file.contents.toString() + 'b');
            cb(null, file);
          }));
      };

      this.testGen.run(() => {
        assert.equal(fs.readFileSync(this.filepath, 'utf8'), 'ab');
        done();
      });
    });

    it('add multiple transform streams to the commit stream', function (done) {
      const self = this;
      this.TestGenerator.prototype.writing = function () {
        this.fs.write(self.filepath, 'not correct');

        this.registerTransformStream([
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

      this.testGen.run(() => {
        assert.equal(fs.readFileSync(this.filepath, 'utf8'), 'ab');
        done();
      });
    });
  });

  describe('Events', () => {
    before(function () {
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

      const lifecycle = ['run', 'method:createSomething', 'method:createSomethingElse', 'end'];

      function assertEvent(e) {
        return function () {
          assert.equal(e, lifecycle.shift());

          if (e === 'end') {
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
        .on('method:createSomethingElse', assertEvent('method:createSomethingElse'));

      angular.run();
    });

    it('only call the end event once (bug #402)', done => {
      class GeneratorOnce extends Base {
        constructor(args, opts) {
          super(args, opts);
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

    it('triggers end event after all generators methods are ran (#709)', done => {
      const endSpy = sinon.spy();
      const GeneratorEnd = class extends Base {
        constructor(args, opts) {
          super(args, opts);
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
      fs.writeFileSync(path.join(resolveddir, 'package.json'), '{ "name": "generator-name" }');
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
      fs.writeFileSync(path.join(resolveddir, 'package.json'), '{ "version": "1.0.0" }');
      assert.equal(this.dummy.rootGeneratorVersion(), '1.0.0');
    });
  });
});
