/* eslint-disable @typescript-eslint/no-unused-expressions */
import fs, { mkdirSync, rmSync } from 'node:fs';
import os from 'node:os';
import path, { dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import process from 'node:process';
import { Buffer } from 'node:buffer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { extend } from 'lodash-es';
import { assert as sinonAssert, fake as sinonFake, spy as sinonSpy } from 'sinon';
import { passthrough } from '@yeoman/transform';
import assert from 'yeoman-assert';
import Environment from 'yeoman-environment';
import helpers from 'yeoman-test';
import { TestAdapter } from '@yeoman/adapter/testing';
import Base from './utils.js';

const require = createRequire(import.meta.url);

const _filename = fileURLToPath(import.meta.url);
const _dirname = dirname(_filename);

const resolveddir = path.join(os.tmpdir(), 'yeoman-base-generator');
const createEnv = (options?) => new Environment({ skipInstall: true, adapter: new TestAdapter(), ...options });

describe('Base', () => {
  let env;
  let Dummy;
  let dummy;

  beforeEach(async () => {
    await helpers.prepareTemporaryDir().run();

    mkdirSync('yeoman-base');
    process.chdir('yeoman-base');

    env = createEnv();
    // Ignore error forwarded to environment
    env.on('error', _ => {});

    mkdirSync(resolveddir, { recursive: true });
    Dummy = class extends Base {};
    Dummy.prototype.exec = sinonSpy();

    dummy = new Dummy(['bar', 'baz', 'bom'], {
      foo: false,
      something: 'else',
      // Mandatory options, created by the `env#create()` helper
      resolved: resolveddir,
      namespace: 'dummy',
      env,
      'skip-install': true,
    });
  });

  afterEach(() => {
    rmSync(path.join(resolveddir, 'package.json'), { force: true });
  });

  describe('constructor', () => {
    it('uses the destinationRoot passed at options', () => {
      const projectDir = path.join(_dirname, 'fixtures/dummy-project');
      const subdir = path.join(projectDir, 'subdir');
      process.chdir(subdir);
      env.cwd = process.cwd();

      const dummy = new Dummy(['foo'], {
        resolved: 'ember/all',
        env,
        destinationRoot: subdir,
      });

      assert.equal(process.cwd(), subdir);
      assert.equal(dummy.destinationPath(), subdir);
      assert.equal(dummy.contextRoot, subdir);
    });

    it('use the environment options', async () => {
      env.registerStub(class extends Base {}, 'ember:model');

      const generator = await env.create('ember:model', {
        options: {
          'test-framework': 'jasmine',
        },
      });

      assert.equal(generator.options['test-framework'], 'jasmine');
    });

    it('set generator.options from constructor options', () => {
      const generator = new Base({
        env,
        resolved: 'test',
        'test-framework': 'mocha',
      });

      assert.equal(generator.options['test-framework'], 'mocha');
    });

    it('set options based on nopt arguments', () => {
      const generator = new Base(['--foo', 'bar'], {
        env,
        resolved: 'test',
      });

      generator.option('foo');
      assert.equal(generator.options.foo, true);
      assert.deepEqual(generator.args, ['bar']);
    });

    it('set arguments based on nopt arguments', () => {
      const generator = new Base(['--foo', 'bar'], {
        env,
        resolved: 'test',
      });

      generator.option('foo');
      generator.argument('baz');
      assert.equal(generator.options.baz, 'bar');
    });

    it('set options with false values', async () => {
      const runResult = await helpers
        .create(path.join(_dirname, './fixtures/options-generator'), { namespace: 'options-generator' }, { createEnv })
        .withOptions({ testOption: false })
        .run();

      assert.equal(runResult.env.rootGenerator().options.testOption, false);
    });

    it('setup fs editor', () => {
      const generator = new Base([], {
        env,
        resolved: 'test',
      });

      assert(generator.fs);
    });

    it('setup required fields for a working generator for help', () => {
      const generator = new Base([], {
        env,
        help: true,
        resolved: 'test',
      });

      assert(generator.env);
      assert(generator.fs);
      assert(generator._debug);
      assert(generator._);

      generator.option('foo');
      generator.argument('baz');
    });

    it('should not fail without an env for help', () => {
      const generator = new Base([], {
        help: true,
        resolved: 'test',
      });

      assert(generator._debug);
      assert(generator._);

      generator.option('foo');
      generator.argument('baz');
    });
  });

  describe('prototype', () => {
    it("methods doesn't conflict with Env#runQueue", () => {
      assert.notImplement(Base.prototype, env.runLoop.queueNames);
    });
  });

  describe('#appname', () => {
    it('is set to the `determineAppname()` return value', () => {
      assert.equal(dummy.appname, dummy.determineAppname());
    });
  });

  describe('#determineAppname()', () => {
    afterEach(() => {
      rmSync('bower.json', { force: true });
      rmSync('package.json', { force: true });
    });

    it('returns appname from package.json', () => {
      dummy.fs.write(dummy.destinationPath('package.json'), '{ "name": "package_app-name" }');

      assert.equal(dummy.determineAppname(), 'package_app name');
    });

    it('returns appname from the current directory', () => {
      assert.equal(dummy.determineAppname(), 'yeoman base');
    });
  });

  describe('#run()', () => {
    let TestGenerator;
    let testGen;
    let execSpy;
    beforeEach(() => {
      TestGenerator = class extends Base {};
      extend(TestGenerator.prototype, {
        _beforeQueue: sinonSpy(),
        exec: sinonSpy(),
        exec2: sinonSpy(),
        exec3: sinonSpy(),
        _private: sinonSpy(),
        '#composed': sinonSpy(),
        prompting: {
          m1: sinonSpy(),
          m2: sinonSpy(),
          _private: sinonSpy(),
          prop: 'foo',
        },
        initializing: sinonSpy(),
      });
      execSpy = TestGenerator.prototype.exec;

      testGen = new TestGenerator([], {
        resolved: 'generator-ember/all/index.js',
        namespace: 'dummy',
        env,
        'skip-install': true,
      });
    });

    it('run all methods in the given generator', () => {
      return testGen.run();
    });

    it('turn on _running flag', async () => {
      await testGen.queueTasks();
      assert.ok(testGen._running);
    });

    it('should call _beforeQueue', async () => {
      await testGen.queueTasks();
      assert.ok(testGen._beforeQueue.calledOnce);
    });

    it('run prototype methods (not instances one)', () => {
      testGen.exec = sinonSpy();
      return testGen.run().then(() => {
        assert.ok(execSpy.calledOnce);
        assert.equal(testGen.exec.callCount, 0);
      });
    });

    it("don't try running prototype attributes", () => {
      TestGenerator.prototype.prop = 'something';
      return testGen.run();
    });

    it('pass instance .args property to the called methods', () => {
      testGen.args = ['2', 'args'];
      return testGen.run().then(() => {
        assert(execSpy.withArgs('2', 'args').calledOnce);
      });
    });

    it('can emit error from sync methods', () =>
      new Promise(done => {
        const error = new Error('Some error');

        TestGenerator.prototype.throwing = () => {
          throw error;
        };

        testGen.env.on('error', error_ => {
          assert.equal(error_, error);
          done();
        });

        testGen.run().catch(() => {});
      }));

    it('stop queue processing once an error is thrown', () => {
      const error = new Error('Some error');
      const spy = sinonSpy();

      TestGenerator.prototype.throwing = () => {
        throw error;
      };

      TestGenerator.prototype.afterError = spy;

      testGen.on('error', sinonSpy());
      return testGen.run().catch(error_ => {
        assert.equal(error_, error);
      });
    });

    it('handle function returning promises as asynchronous', () => {
      const spy1 = sinonSpy();
      const spy2 = sinonSpy();

      TestGenerator.prototype.first = async () => {
        return new Promise(resolve => {
          setTimeout(() => {
            spy1();
            resolve();
          }, 10);
        });
      };

      TestGenerator.prototype.second = () => {
        spy2();
      };

      return testGen.run().then(() => {
        spy1.calledBefore(spy2);
      });
    });

    it('handle failing promises as errors', () =>
      new Promise(done => {
        TestGenerator.prototype.failing = async () => {
          return new Promise((resolve, reject) => {
            reject(new Error('some error'));
          });
        };

        testGen.env.on('error', error => {
          assert.equal(error.message, 'some error');
          done();
        });

        testGen.run().catch(() => {});
      }));

    it('throws if no method is available', async () => {
      const gen = new (class extends Base {})([], {
        resolved: 'generator-ember/all/index.js',
        namespace: 'dummy',
        env,
      });

      return gen.run().catch(error => {
        assert(error.toString().includes('This Generator is empty'));
      });
    });

    it("doesn't throw if no method is available with customLifecycle", async () => {
      const gen = new (class extends Base {})([], {
        resolved: 'generator-ember/all/index.js',
        namespace: 'dummy',
        env,
      });
      gen.customLifecycle = true;

      await gen.run();
    });

    it('will run non-enumerable methods', async () => {
      class Generator extends Base {}

      Object.defineProperty(Generator.prototype, 'nonenumerable', {
        value: sinonSpy(),
        configurable: true,
        writable: true,
      });

      const gen = new Generator([], {
        resolved: 'dummy',
        namespace: 'dummy',
        env,
      });

      return gen.run().then(() => {
        assert(gen.nonenumerable.called);
      });
    });

    it('ignore underscore prefixed method', () => {
      return testGen.run().then(() => {
        assert(TestGenerator.prototype._private.notCalled);
      });
    });

    it('ignore hashtag prefixed method', () => {
      return testGen.run().then(() => {
        assert(TestGenerator.prototype['#composed'].notCalled);
      });
    });

    it('run methods in a queue hash', () => {
      return testGen.run().then(() => {
        assert(TestGenerator.prototype.prompting.m1.calledOnce);
        assert(TestGenerator.prototype.prompting.m2.calledOnce);
      });
    });

    it('ignore underscore prefixed method in a queue hash', () => {
      return testGen.run().then(() => {
        assert(TestGenerator.prototype.prompting._private.notCalled);
      });
    });

    it('run named queued methods in order', () => {
      const initSpy = TestGenerator.prototype.initializing;
      const promptSpy = TestGenerator.prototype.prompting.m1;

      return testGen.run().then(() => {
        assert(initSpy.calledBefore(promptSpy));
      });
    });

    it('run queued methods in order even if not in order in prototype', () => {
      const initSpy = TestGenerator.prototype.initializing;
      const execSpy = TestGenerator.prototype.exec;

      return testGen.run().then(() => {
        assert(initSpy.calledBefore(execSpy));
      });
    });

    it('commit mem-fs to disk', () => {
      let filepath;

      TestGenerator.prototype.writing = function () {
        this.fs.write((filepath = path.join(this.destinationRoot(), 'fromfs.txt')), 'generated');
      };

      return testGen.run().then(() => {
        assert(fs.existsSync(filepath));
      });
    });

    it('allow skipping file writes to disk', () => {
      const action = { action: 'skip' };
      const filepath = path.join(_dirname, '/fixtures/conflict.js');
      assert(fs.existsSync(filepath));

      TestGenerator.prototype.writing = function () {
        this.fs.write(filepath, 'some new content');
      };

      const env = createEnv({ adapter: new TestAdapter({ mockedAnswers: action }) });
      const testGen = new TestGenerator([], {
        resolved: 'generator/app/index.js',
        namespace: 'dummy',
        env,
      });

      return testGen.run().then(() => {
        assert.equal(fs.readFileSync(filepath, 'utf8'), 'var a = 1;\n');
      });
    });

    it('allows file writes in any priorities', () => {
      TestGenerator.prototype.end = function () {
        this.fs.write(this.destinationPath('foo.txt'), 'test');
      };

      return testGen.run().then(() => {
        assert(fs.existsSync(testGen.destinationPath('foo.txt')));
      });
    });

    it('can cancel cancellable tasks', () =>
      new Promise(done => {
        TestGenerator.prototype.cancel = function () {
          this.cancelCancellableTasks();
        };

        TestGenerator.prototype.throwing = () => {
          throw new Error('not thrown');
        };

        testGen.run().then(done);
      }));

    it('can start over the generator', () =>
      new Promise(done => {
        const spy1 = sinonSpy();
        const spy2 = sinonSpy();

        TestGenerator.prototype.cancel = function () {
          spy1();
          if (!this.startedOver) {
            this.startOver({ startedOver: true });
            this.startedOver = true;
          }
        };

        TestGenerator.prototype.after = function () {
          assert(this.options.startedOver);
          assert(this.startedOver);
          spy2();
        };

        testGen.run().then(() => {
          assert(spy1.calledTwice);
          assert(spy2.calledOnce);
          done();
        });
      }));

    it('can queue a method again', () =>
      new Promise(done => {
        const spy1 = sinonSpy();

        TestGenerator.prototype.cancel = function () {
          spy1();
          if (!this.startedOver) {
            this.queueOwnTask('cancel');
            this.startOver();
            this.startedOver = true;
          }
        };

        testGen.run().then(() => {
          assert(spy1.calledTwice);
          done();
        });
      }));
  });

  describe('#run() with task prefix', () => {
    let TestGenerator;
    let testGen;

    beforeEach(() => {
      TestGenerator = class extends Base {};
      extend(TestGenerator.prototype, {
        beforeQueue: sinonSpy(),
        _private: sinonSpy(),
        '#composed': sinonSpy(),
        composed: sinonSpy(),
        '#initializing': sinonSpy(),
        initializing: sinonSpy(),
      });

      testGen = new TestGenerator(
        [],
        {
          resolved: 'generator-ember/all/index.js',
          namespace: 'dummy',
          env,
          'skip-install': true,
        },
        { taskPrefix: '#' },
      );
    });

    it('should run hashtag prefixed method', async () => {
      await testGen.run();
      assert(TestGenerator.prototype['#composed'].calledOnce);
      assert(TestGenerator.prototype.composed.notCalled);
      assert(TestGenerator.prototype['#initializing'].calledOnce);
      assert(TestGenerator.prototype.initializing.notCalled);
      assert(TestGenerator.prototype._private.notCalled);
    });

    it('should call beforeQueue', async () => {
      await testGen.queueTasks();
      assert.ok(testGen.beforeQueue.calledOnce);
    });
  });

  describe('#argument()', () => {
    it('add a new argument to the generator instance', () => {
      assert.equal(dummy._arguments.length, 0);
      dummy.argument('foo');
      assert.equal(dummy._arguments.length, 1);
    });

    it('create the property specified with value from positional args', () => {
      dummy.argument('foo');
      assert.equal(dummy.options.foo, 'bar');
    });

    it('allows specifying default argument values', () => {
      const Generator = class extends Base {
        constructor(args, options) {
          super(args, options);

          this.argument('bar', { default: 'baz' });
        }
      };

      const gen = new Generator({
        env,
        resolved: 'test',
      });

      assert.equal(gen.options.bar, 'baz');
    });

    it('allows specifying default argument values', () => {
      const Generator = class extends Base {
        constructor(args, options) {
          super(args, options);

          this.argument('bar', { default: 'baz' });
        }
      };

      const gen = new Generator({
        env,
        resolved: 'test',
      });

      assert.equal(gen.options.bar, 'baz');
    });

    it('properly uses arguments values passed from constructor', () => {
      const Generator = class extends Base {
        constructor(args, options) {
          super(args, options);

          this.argument('bar', { default: 'baz' });
        }
      };

      const gen = new Generator({
        env,
        resolved: 'test',
        bar: 'foo',
      });

      assert.equal(gen.options.bar, 'foo');
    });

    it('slice positional arguments when config.type is Array', () => {
      dummy.argument('bar', { type: Array });
      assert.deepEqual(dummy.options.bar, ['bar', 'baz', 'bom']);
    });

    it('raise an error if required arguments are not provided', () =>
      new Promise(done => {
        const dummy = new Base([], {
          env,
          resolved: 'dummy/all',
        });

        try {
          dummy.argument('foo', { required: true });
        } catch (error) {
          assert(error.message.startsWith('Did not provide required argument '));
          done();
        }
      }));

    it("doesn't raise an error if required arguments are not provided, but the help option has been specified", () => {
      const dummy = new Base([], {
        env,
        resolved: 'dummy:all',
        help: true,
      });

      assert.equal(dummy._arguments.length, 0);
      assert.doesNotThrow(dummy.argument.bind(dummy, 'foo', { required: true }));
      assert.equal(dummy._arguments.length, 1);
    });

    it('can be called before #option()', () => {
      const dummy = new Base(['--foo', 'bar', 'baz'], {
        env,
        resolved: 'dummy/all',
      });

      dummy.argument('baz');
      dummy.option('foo', { type: String });

      assert.equal(dummy.options.baz, 'baz');
    });
  });

  describe('#option()', () => {
    it('add a new option to the set of generator expected options', () => {
      // Every generator have the --help options
      const generator = new Dummy([], {
        env,
        resolved: 'test',
      });

      generator.option('foo');
      assert.deepEqual(generator._options.foo, {
        description: 'Description for foo',
        name: 'foo',
        type: Boolean,
        hide: false,
      });
    });

    it('allow aliasing options', () => {
      const Generator = class extends Base {
        constructor(args, options) {
          super(args, options);

          this.option('long-name', {
            alias: 'short-name',
            type: String,
          });
        }
      };

      const gen = new Generator({
        env,
        resolved: 'test',
        'short-name': 'that value',
      });

      assert.equal(gen.options['long-name'], 'that value');
    });

    it('allows Boolean options to be undefined', () => {
      const Generator = class extends Base {
        constructor(args, options) {
          super(args, options);

          this.option('undef', { type: Boolean });
        }
      };

      const gen = new Generator({
        env,
        resolved: 'test',
      });

      assert.equal(gen.options.undef, undefined);
    });

    it('disallows Boolean options starting with no-', () => {
      const generator = new Dummy([], {
        env,
        resolved: 'test',
      });
      const addWrongOp = () => {
        generator.option('no-op');
      };

      assert.throws(addWrongOp, /this\.option\('op', {type: Boolean}\)/);
    });
  });

  describe('#registerConfigPrompts()', () => {
    it('adds an prompt with common definitions', () => {
      dummy.registerConfigPrompts({
        name: 'foo',
        message: 'bar',
        type: 'number',
        prompt: true,
      });
      assert.equal(dummy._prompts[0].name, 'foo');
      assert.equal(dummy._prompts[0].message, 'bar');
      assert.equal(dummy._prompts[0].type, 'number');
    });

    it('should export option', () => {
      dummy.registerConfigPrompts({
        name: 'foo',
        message: 'bar2',
        type: 'string',
        exportOption: true,
      });
      assert.equal(dummy._prompts[0].name, 'foo');
      assert.equal(dummy._prompts[0].message, 'bar2');
      assert.equal(dummy._prompts[0].type, 'string');
      assert.equal(dummy._options.foo.name, 'foo');
      assert.equal(dummy._options.foo.description, 'bar2');
      assert.equal(dummy._options.foo.type, String);
    });

    it('allows to customize option config', () => {
      dummy.registerConfigPrompts({
        name: 'foo',
        message: 'bar2',
        type: 'string',
        exportOption: {
          description: 'bar3',
          name: 'foo2',
          type: Number,
        },
      });
      assert.equal(dummy._prompts[0].name, 'foo');
      assert.equal(dummy._prompts[0].message, 'bar2');
      assert.equal(dummy._prompts[0].type, 'string');
      assert.equal(dummy._options.foo2.name, 'foo2');
      assert.equal(dummy._options.foo2.description, 'bar3');
      assert.equal(dummy._options.foo2.type, Number);
    });
  });

  describe('#registerPriorities()', () => {
    it('adds a new priority', () => {
      const priority = {
        priorityName: 'foo',
        before: 'initializing',
      };
      dummy.registerPriorities([priority]);
      assert.ok(dummy._queues.foo);
    });
    it('edits a existing priority', () => {
      const priority = {
        priorityName: 'initializing',
        args: 'an arg array',
      };
      dummy.registerPriorities([priority]);
      assert.equal(dummy._queues.initializing.args, 'an arg array');
      assert.equal(dummy._queues.initializing.edit, undefined);
    });
  });

  describe('#parseOptions()', () => {
    beforeEach(() => {
      dummy = new Dummy(['start', '--foo', 'bar', '-s', 'baz', 'remain'], {
        env,
        resolved: 'test',
      });

      dummy.option('foo', {
        type: String,
      });

      dummy.option('shortOpt', {
        type: String,
        alias: 's',
      });
    });

    it('set generator options', () => {
      dummy.parseOptions();
      assert.equal(dummy.options.foo, 'bar');
    });

    it('set generator alias options', () => {
      dummy.parseOptions();
      assert.equal(dummy.options.shortOpt, 'baz');
    });

    it('set args to what remains', () => {
      dummy.parseOptions();
      assert.deepEqual(dummy.args, ['start', 'remain']);
    });

    it('gracefully handle no args', () => {
      const dummy = new Dummy({
        env,
        resolved: 'test',
      });

      dummy.option('foo', {
        type: String,
      });

      dummy.parseOptions();
      assert.equal(dummy.options.foo, undefined);
    });
  });

  describe('#composeWith()', () => {
    let spy;
    let GenCompose;
    beforeEach(() => {
      dummy = new Dummy([], {
        resolved: 'unknown',
        namespace: 'dummy',
        env,
        'skip-install': true,
        'force-install': true,
        'skip-cache': true,
      });

      spy = sinonSpy();
      GenCompose = class extends Base {};
      GenCompose.prototype.exec = spy;
      env.registerStub(GenCompose, 'composed:gen');
    });

    it('returns the composed generator', async () => {
      assert((await dummy.composeWith('composed:gen')) instanceof GenCompose);
    });

    it('runs the composed generators', async () => {
      await dummy.composeWith('composed:gen');

      const runSpy = sinonSpy(dummy, 'run');
      await dummy.run();
      sinonAssert.callOrder(runSpy, spy);
      assert(spy.calledAfter(runSpy));
    });

    it('runs the composed Generator class in the passed path', async () => {
      const stubPath = path.join(_dirname, 'fixtures/generator-mocha');

      await dummy.composeWith({
        Generator: GenCompose,
        path: stubPath,
      });
      await dummy.run();
      assert.equal(spy.firstCall.thisValue.options.namespace, 'mocha');
      assert.equal(
        spy.firstCall.thisValue.options.resolved,
        pathToFileURL(createRequire(import.meta.url).resolve(stubPath)).href,
      );
    });

    describe('object as first argument', () => {
      it('fails for missing Generator property', async () => {
        const gen = dummy;
        await expect(
          gen.composeWith({
            path: 'foo-path',
          }),
        ).rejects.toThrow('Missing Generator property');
      });

      it('fails for missing path property', async () => {
        const gen = dummy;
        await expect(
          gen.composeWith({
            Generator: GenCompose,
          }),
        ).rejects.toThrow('path property is not a string');
      });
    });

    it('run the composed generator even if main generator is already running.', () => {
      Dummy.prototype.writing = async function () {
        await this.composeWith('composed:gen');
      };

      return dummy.run().then(() => {
        assert(spy.called);
      });
    });

    it('pass options and arguments to the composed generators', async () => {
      await dummy.composeWith('composed:gen', {
        foo: 'bar',
        'skip-install': true,
      });

      return dummy.run().then(() => {
        assert.equal(spy.firstCall.thisValue.options.foo, 'bar');
      });
    });

    describe('when passing a local path to a generator', () => {
      let stubPath;
      let resolvedStub;
      let LocalDummy;
      beforeEach(async () => {
        spy = sinonSpy();
        dummy.resolved = _filename;
        stubPath = './fixtures/generator-mocha';
        resolvedStub = pathToFileURL(require.resolve(stubPath)).href;
        const module = await import(resolvedStub);
        LocalDummy = module.default;
        LocalDummy.prototype.exec = spy;
      });

      afterEach(() => {
        delete LocalDummy.prototype.exec;
      });

      it('runs the composed generator', async () => {
        await dummy.composeWith(stubPath, {});
        await dummy.run();
        assert(LocalDummy.prototype.exec.called);
      });

      it('pass options and arguments to the composed generators', async () => {
        await dummy.composeWith(stubPath, {
          foo: 'bar',
          'skip-install': true,
        });
        await dummy.run();
        assert.equal(spy.firstCall.thisValue.options.foo, 'bar');
      });

      it('sets correct metadata on the Generator constructor', async () => {
        await dummy.composeWith(stubPath, {});
        await dummy.run();
        assert.equal(spy.firstCall.thisValue.options.namespace, 'mocha');
        assert.equal(spy.firstCall.thisValue.options.resolved, resolvedStub);
      });
    });
  });

  describe('#desc()', () => {
    it('update the internal description', () => {
      dummy.desc('A new desc for this generator');
      assert.equal(dummy.description, 'A new desc for this generator');
    });
  });

  describe('#help()', () => {
    it('return the expected help output', () => {
      dummy.option('ooOoo');
      dummy.argument('baz', {
        type: Number,
        required: false,
        description: 'definition; explanation; summary',
      });
      dummy.desc('A new desc for this generator');

      const help = dummy.help();
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
        '',
      ];

      for (const [i, line] of help.split('\n').entries()) {
        // Do not test whitespace; we care about the content, not formatting.
        // formatting is best left up to the tests for module "text-table"
        assert.textEqual(line.trim().replaceAll(/\s+/g, ' '), expected[i]);
      }
    });
  });

  describe('#usage()', () => {
    it('returns the expected usage output with arguments', () => {
      dummy.argument('baz', {
        type: Number,
        required: false,
      });

      const usage = dummy.usage();
      assert.equal(usage.trim(), 'yo dummy [<baz>] [options]');
    });

    it('returns the expected usage output without arguments', () => {
      dummy._arguments.length = 0;
      const usage = dummy.usage();
      assert.equal(usage.trim(), 'yo dummy [options]');
    });

    it('returns the expected usage output without options', () => {
      dummy._arguments.length = 0;
      dummy._options = {};
      const usage = dummy.usage();
      assert.equal(usage.trim(), 'yo dummy');
    });
  });

  describe('#config', () => {
    it('provide a storage instance', async () => {
      const module = await import('../src/util/storage.js');
      assert.ok(dummy.config instanceof module.default);
    });

    it('is updated when destinationRoot change', () => {
      sinonSpy(Dummy.prototype, '_getStorage');
      dummy.destinationRoot('foo');

      dummy.config;
      assert.equal(Dummy.prototype._getStorage.callCount, 1);
      dummy.destinationRoot();

      dummy.config;
      assert.equal(Dummy.prototype._getStorage.callCount, 1);
      dummy.destinationRoot('foo');

      dummy.config;
      assert.equal(Dummy.prototype._getStorage.callCount, 2);
      Dummy.prototype._getStorage.restore();
    });
  });

  describe('#templatePath()', () => {
    it('joins path to the source root', () => {
      assert.equal(dummy.templatePath('bar.js'), path.join(dummy.sourceRoot(), 'bar.js'));
      assert.equal(dummy.templatePath('dir/', 'bar.js'), path.join(dummy.sourceRoot(), '/dir/bar.js'));
    });
  });

  describe('#destinationPath()', () => {
    it('joins path to the source root', () => {
      assert.equal(dummy.destinationPath('bar.js'), path.join(dummy.destinationRoot(), 'bar.js'));
      assert.equal(dummy.destinationPath('dir/', 'bar.js'), path.join(dummy.destinationRoot(), '/dir/bar.js'));
    });
  });

  describe('#queueTransformStream()', () => {
    let TestGenerator;
    let testGen;
    let filepath;

    beforeEach(() => {
      filepath = path.join(os.tmpdir(), '/yeoman-transform-stream/filea.txt');
      TestGenerator = class extends Base {};
      TestGenerator.prototype.exec = sinonSpy();
      testGen = new TestGenerator([], {
        resolved: 'generator-ember/all/index.js',
        namespace: 'dummy',
        env,
      });
    });

    afterEach(() => {
      rmSync(filepath, { force: true });
    });

    it('add the transform stream to the commit stream', () => {
      TestGenerator.prototype.writing = function () {
        this.fs.write(filepath, 'not correct');

        this.queueTransformStream(
          passthrough(file => {
            if (file.path === filepath) {
              file.contents = Buffer.from(`${file.contents.toString()} a`);
            }
          }),
        )
          .queueTransformStream(
            passthrough(file => {
              if (file.path === filepath) {
                file.contents = Buffer.from(`${file.contents.toString()} b`);
              }
            }),
          )
          .queueTransformStream(
            { priorityToQueue: 'prompting' },
            passthrough(file => {
              if (file.path === filepath) {
                file.contents = Buffer.from(`${file.contents.toString()} prompting`);
              }
            }),
          )
          .queueTransformStream(
            { priorityToQueue: 'initializing' },
            passthrough(file => {
              if (file.path === filepath) {
                file.contents = Buffer.from('initializing');
              }
            }),
          );
      };

      return testGen.run().then(() => {
        assert.equal(fs.readFileSync(filepath, 'utf8'), 'initializing prompting a b');
      });
    });

    it('add multiple transform streams to the commit stream', () => {
      TestGenerator.prototype.writing = function () {
        this.fs.write(filepath, 'not correct');

        this.queueTransformStream(
          passthrough(file => {
            if (file.path === filepath) {
              file.contents = Buffer.from('a');
            }
          }),
          passthrough(file => {
            if (file.path === filepath) {
              file.contents = Buffer.from(`${file.contents.toString()}b`);
            }
          }),
        );
      };

      return testGen.run().then(() => {
        assert.equal(fs.readFileSync(filepath, 'utf8'), 'ab');
      });
    });
  });

  describe('Events', () => {
    let Generator;
    beforeEach(() => {
      Generator = class Generator extends Base {};
      Generator.namespace = 'angular:app';
      Generator.prototype.createSomething = () => {};
      Generator.prototype.createSomethingElse = () => {};
    });

    it('emits the series of event on a specific generator', () =>
      new Promise(done => {
        const angular = new Generator([], {
          env: createEnv([], {}, new TestAdapter()),
          resolved: _filename,
          'skip-install': true,
        });

        const lifecycle = ['run', 'method:createSomething', 'method:createSomethingElse', 'end'];

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
          .on('method:createSomethingElse', assertEvent('method:createSomethingElse'));

        angular.run().catch(() => {});
      }));

    it('only call the end event once (bug #402)', () =>
      new Promise(done => {
        class GeneratorOnce extends Base {
          constructor(args, options) {
            super(args, options);
            this.sourceRoot(path.join(_dirname, 'fixtures'));
            this.destinationRoot(path.join(os.tmpdir(), 'yeoman-base-once'));
          }

          createDuplicate() {
            this.fs.copy(this.templatePath('foo-copy.js'), this.destinationPath('foo-copy.js'));
            this.fs.copy(this.templatePath('foo-copy.js'), this.destinationPath('foo-copy.js'));
          }
        }

        let isFirstEndEvent = true;
        const generatorOnce = new GeneratorOnce([], {
          env: createEnv([], {}, new TestAdapter()),
          resolved: _filename,
          'skip-install': true,
        });

        generatorOnce.on('end', () => {
          assert.ok(isFirstEndEvent);

          if (isFirstEndEvent) {
            done();
          }

          isFirstEndEvent = false;
        });

        generatorOnce.run().catch(() => {});
      }));

    it('triggers end event after all generators methods are ran (#709)', () =>
      new Promise(done => {
        const endSpy = sinonSpy();
        const GeneratorEnd = class extends Base {
          constructor(args, options) {
            super(args, options);
            this.on('end', () => {
              sinonAssert.calledOnce(endSpy);
              done();
            });
          }

          end() {
            endSpy();
          }
        };

        const generatorEnd = new GeneratorEnd([], {
          env: createEnv([], {}, new TestAdapter()),
          resolved: _filename,
          'skip-install': true,
        });

        generatorEnd.run().catch(() => {});
      }));
  });

  describe('#rootGeneratorName', () => {
    it('returns the default name', () => {
      assert.equal(dummy.rootGeneratorName(), '*');
    });

    it('returns generator name', () => {
      fs.writeFileSync(path.join(resolveddir, 'package.json'), '{ "name": "generator-name" }');
      assert.equal(dummy.rootGeneratorName(), 'generator-name');
    });
  });

  describe('#rootGeneratorVersion', () => {
    afterEach(() => {
      rmSync(path.join(resolveddir, 'package.json'), { force: true });
    });

    it('returns the default version', () => {
      assert.equal(dummy.rootGeneratorVersion(), '0.0.0');
    });

    it('returns generator version', () => {
      fs.writeFileSync(path.join(resolveddir, 'package.json'), '{ "version": "1.0.0" }');
      assert.equal(dummy.rootGeneratorVersion(), '1.0.0');
    });
  });

  describe('#queueMethod()', () => {
    let Generator;
    beforeEach(() => {
      Generator = class extends Base {
        constructor(args, options) {
          super(args, options);

          this.queueMethod(
            {
              testQueue() {
                this.queue = this.options.testQueue;
              },
            },
            () => {},
          );
        }

        exec() {}
      };
    });

    it('queued method is executed', () =>
      new Promise(done => {
        const gen = new Generator({
          resolved: resolveddir,
          namespace: 'dummy',
          env,
          testQueue: 'This value',
        });

        gen.run().then(() => {
          assert.equal(gen.queue, 'This value');
          done();
        });
      }));

    it('queued method is executed by derived generator', () =>
      new Promise(done => {
        const Derived = class extends Generator {
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

        const derivedGen = new Derived([], {
          resolved: resolveddir,
          namespace: 'dummy',
          env,
          testQueue: 'That value',
        });

        derivedGen.run().then(() => {
          assert.equal(derivedGen.queue, 'That value');
          done();
        });
      }));

    it('queued method with function, methodName and reject', () => {
      const env = createEnv([], { 'skip-install': true }, new TestAdapter());
      const gen = new Generator({
        resolved: resolveddir,
        namespace: 'dummy',
        env,
        testQueue: 'This value',
      });

      sinonSpy(env, 'queueTask');
      const noop = () => {};
      gen.queueMethod(noop, 'configuring', noop);

      assert(env.queueTask.calledOnce);
      assert.equal('default', env.queueTask.getCall(0).args[0]);
    });

    it('queued method with object, queueName and reject', () => {
      const env = createEnv([], { 'skip-install': true }, new TestAdapter());
      const gen = new Generator({
        resolved: resolveddir,
        namespace: 'dummy',
        env,
        testQueue: 'This value',
      });

      sinonSpy(env, 'queueTask');
      const noop = () => {};
      const queueName = 'configuring';
      const tasks = {
        foo() {},
      };
      gen.queueMethod(tasks, queueName, noop);

      assert(env.queueTask.calledOnce);
      assert.equal(queueName, env.queueTask.getCall(0).args[0]);
    });
  });

  describe('#queueTask()', () => {
    let Generator;
    beforeEach(() => {
      Generator = class extends Base {
        constructor(args, options) {
          super(args, options);

          this.queueMethod(
            {
              testQueue() {
                this.queue = this.options.testQueue;
              },
            },
            () => {},
          );
        }

        exec() {}
      };
    });

    it('queued method with function and options', async () => {
      const env = createEnv([], { 'skip-install': true }, new TestAdapter());
      const gen = new Generator({
        resolved: resolveddir,
        namespace: 'dummy',
        env,
        testQueue: 'This value',
      });

      sinonSpy(env, 'queueTask');
      const method = sinonFake();
      const taskName = 'foo';
      const queueName = 'configuring';
      const arg = {};

      gen.queueTask({
        method,
        queueName,
        taskName,
        once: true,
        run: false,
        args: [arg],
      });

      assert(env.queueTask.calledOnce);
      assert.equal(queueName, env.queueTask.getCall(0).args[0]);
      assert.deepStrictEqual(
        {
          once: taskName,
          startQueue: false,
        },
        env.queueTask.getCall(0).args[2],
      );

      await gen.run();
      assert(method.calledOnce);
      assert.equal(arg, method.getCall(0).args[0]);
    });

    it('queued method with function and options with reject', async () => {
      const gen = new Generator({
        resolved: resolveddir,
        namespace: 'dummy',
        env,
        testQueue: 'This value',
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
        reject() {},
      });

      await gen.run();
      assert.equal(thrown, true);
    });

    it('rejecting a task should stop the queue', async () => {
      const gen = new Generator({
        resolved: resolveddir,
        namespace: 'dummy',
        env,
        testQueue: 'This value',
      });

      const queueName = 'configuring';
      gen.queueTask({
        method() {
          throw new Error('Some error');
        },
        queueName,
        taskName: 'foo',
        run: false,
      });

      const secondTask = vi.fn();
      gen.queueTask({
        method: secondTask,
        queueName,
        taskName: 'secondTask',
        run: false,
      });

      await expect(gen.run()).rejects.toThrow('Some error');
      if (env.runLoop) {
        expect(env.runLoop.running).toBe(false);
      }

      expect(secondTask).not.toHaveBeenCalled();
    });
  });

  describe('Custom priorities', () => {
    let TestGenerator;
    let testGen;

    beforeEach(() => {
      TestGenerator = class extends Base {
        constructor(args, options, features) {
          super(
            args,
            {
              ...options,
            },
            {
              customPriorities: [
                ...(features?.customPriorities || []),
                {
                  // Change priority prompting to be queue before writing for this generator.
                  // If we change defaults priorities in the future, the order of custom priorities will keep the same.
                  priorityName: 'prompting',
                  before: 'writing',
                },
                {
                  priorityName: 'prePrompting1',
                  before: 'prompting',
                },
                {
                  priorityName: 'preConfiguring1',
                  before: 'preConfiguring2',
                  queueName: 'common#preConfiguring1',
                  once: true,
                },
                {
                  priorityName: 'preConfiguring2',
                  before: 'configuring',
                },
                {
                  priorityName: 'afterEnd',
                },
              ],
            },
          );
        }
      };
    });

    it('generates correct _queues and runLoop queueNames', () => {
      extend(TestGenerator.prototype, {
        assert() {
          assert.deepStrictEqual(this._queues, {
            initializing: {
              priorityName: 'initializing',
              queueName: 'initializing',
            },
            preConfiguring1: {
              priorityName: 'preConfiguring1',
              queueName: 'common#preConfiguring1',
              before: 'preConfiguring2',
              once: true,
            },
            preConfiguring2: {
              priorityName: 'preConfiguring2',
              queueName: 'dummy#preConfiguring2',
              before: 'configuring',
            },
            configuring: {
              priorityName: 'configuring',
              queueName: 'configuring',
            },
            default: { priorityName: 'default', queueName: 'default' },
            prePrompting1: {
              priorityName: 'prePrompting1',
              queueName: 'dummy#prePrompting1',
              before: 'prompting',
            },
            prompting: {
              priorityName: 'prompting',
              queueName: 'dummy#prompting',
              before: 'writing',
            },
            writing: { priorityName: 'writing', queueName: 'writing' },
            transform: { priorityName: 'transform', queueName: 'transform' },
            conflicts: { priorityName: 'conflicts', queueName: 'conflicts' },
            install: { priorityName: 'install', queueName: 'install' },
            end: { priorityName: 'end', queueName: 'end' },
            afterEnd: { priorityName: 'afterEnd', queueName: 'dummy#afterEnd' },
          });
          assert.deepStrictEqual(env.runLoop.queueNames, [
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
            'dummy#afterEnd',
          ]);
        },
      });

      testGen = new TestGenerator([], {
        resolved: 'generator-ember/all/index.js',
        namespace: 'dummy',
        env,
        'skip-install': true,
      });

      return testGen.run();
    });

    it('run custom priorities in correct order', () => {
      const prePrompting1 = sinonSpy();
      const preConfiguring1 = sinonSpy();
      const preConfiguring2 = sinonSpy();
      const afterEnd = sinonSpy();

      const initializing = sinonSpy();
      const prompting = sinonSpy();
      const configuring = sinonSpy();
      const end = sinonSpy();

      extend(TestGenerator.prototype, {
        prePrompting1,
        preConfiguring1,
        preConfiguring2,
        afterEnd,
        initializing,
        prompting,
        configuring,
        end,
      });

      testGen = new TestGenerator([], {
        resolved: 'generator-ember/all/index.js',
        namespace: 'dummy',
        env,
        'skip-install': true,
      });

      return testGen.run().then(() => {
        assert(initializing.calledBefore(preConfiguring1));
        assert(preConfiguring1.calledBefore(preConfiguring2));
        assert(preConfiguring2.calledBefore(configuring));
        assert(configuring.calledBefore(prePrompting1));
        assert(prePrompting1.calledBefore(prompting));
        assert(prompting.calledBefore(end));
        assert(end.calledBefore(afterEnd));
      });
    });

    it('correctly run custom priority with once option', async () => {
      const commonPreConfiguring = sinonSpy();
      const customPreConfiguring1 = sinonSpy();
      const customPreConfiguring2 = sinonSpy();

      extend(TestGenerator.prototype, {
        get preConfiguring1() {
          return { commonPreConfiguring };
        },
      });

      class TestGenerator2 extends TestGenerator {
        get preConfiguring1() {
          return { ...super.preConfiguring1, customPreConfiguring1 };
        }
      }

      class TestGenerator3 extends TestGenerator {
        get preConfiguring1() {
          return { ...super.preConfiguring1, customPreConfiguring2 };
        }
      }

      testGen = new TestGenerator2([], {
        resolved: 'unknown',
        namespace: 'dummy',
        env,
        'skip-install': true,
      });

      await testGen.composeWith({
        Generator: TestGenerator3,
        path: 'unknown',
      });

      return testGen.run().then(() => {
        sinonAssert.calledOnce(commonPreConfiguring);
        sinonAssert.calledOnce(customPreConfiguring1);
        sinonAssert.calledOnce(customPreConfiguring2);
      });
    });
  });

  describe('Custom priorities errors', () => {
    it('error is thrown with duplicate custom queue', () => {
      const TestGenerator = class extends Base {
        constructor(args, options) {
          super(
            args,
            {
              ...options,
            },
            {
              customPriorities: [
                {
                  priorityName: 'beforePrompting',
                  before: 'prompting',
                },
                {
                  priorityName: 'beforePrompting',
                  before: 'prompting',
                },
              ],
            },
          );
        }
      };

      assert.throws(
        () =>
          new TestGenerator([], {
            resolved: 'generator-ember/all/index.js',
            namespace: 'dummy',
            env,
            'skip-install': true,
          }),
      );
    });
  });

  describe('#prompt', () => {
    let promptSpy;
    const input1Prompt = { type: 'input', name: 'prompt1' };
    const input2Prompt = { type: 'input', name: 'prompt2' };
    beforeEach(() => {
      dummy.env.adapter = new TestAdapter({
        mockedAnswers: {
          prompt1: 'prompt1NewValue',
          prompt2: 'prompt2NewValue',
        },
      });
      promptSpy = sinonSpy(dummy.env.adapter, 'prompt');
      dummy.options.askAnswered = true;
      dummy.config.set('prompt1', 'prompt1Value');
      dummy.config.set('prompt2', 'prompt2Value');
      dummy.config.set('notUsed', 'notUsedValue');
    });
    afterEach(() => {
      promptSpy.restore();
    });

    it('passes config value as answer to adapter', () => {
      const expectedAnswers = { prompt1: 'prompt1Value' };
      return dummy.prompt(input1Prompt, dummy.config).then(_ => {
        assert.deepEqual(promptSpy.getCall(0).args[1], expectedAnswers);
      });
    });

    it('passes config values as answers to adapter', () => {
      const expectedAnswers = {
        prompt1: 'prompt1Value',
        prompt2: 'prompt2Value',
      };
      return dummy.prompt([input1Prompt, input2Prompt], dummy.config).then(_ => {
        assert.deepEqual(promptSpy.getCall(0).args[1], expectedAnswers);
      });
    });

    it('passes config values as the question default', () => {
      return dummy.prompt([input1Prompt, input2Prompt], dummy.config).then(_ => {
        const [prompts, answers] = promptSpy.getCall(0).args;
        assert.deepEqual(prompts[0].default(answers), 'prompt1Value');
        assert.deepEqual(prompts[1].default(answers), 'prompt2Value');
      });
    });

    it('saves answers to config', () => {
      return dummy.prompt([input1Prompt, input2Prompt], dummy.config).then(answers => {
        assert.equal(answers.prompt1, 'prompt1NewValue');
        assert.equal(answers.prompt2, 'prompt2NewValue');
        assert.equal(dummy.config.get('prompt1'), 'prompt1NewValue');
        assert.equal(dummy.config.get('prompt2'), 'prompt2NewValue');
      });
    });

    it('saves answers to config when specified as a property name', () => {
      return dummy.prompt([{ ...input1Prompt, storage: 'config' }, input2Prompt]).then(answers => {
        assert.equal(answers.prompt1, 'prompt1NewValue');
        assert.equal(answers.prompt2, 'prompt2NewValue');
        assert.equal(dummy.config.get('prompt1'), 'prompt1NewValue');
        assert.equal(dummy.config.get('prompt2'), 'prompt2Value');
      });
    });

    it('saves answers to specific storage', () => {
      return dummy.prompt([{ ...input1Prompt, storage: dummy.config }, input2Prompt]).then(answers => {
        assert.equal(answers.prompt1, 'prompt1NewValue');
        assert.equal(answers.prompt2, 'prompt2NewValue');
        assert.equal(dummy.config.get('prompt1'), 'prompt1NewValue');
        assert.equal(dummy.config.get('prompt2'), 'prompt2Value');
      });
    });

    it('passes correct askAnswered option to adapter', () => {
      return dummy.prompt([input1Prompt], dummy.config).then(_ => {
        assert.deepEqual(promptSpy.getCall(0).args[0][0].askAnswered, true);
      });
    });
  });

  describe('#getFeatures', () => {
    it('should return namespace as uniqueBy when unique is true', () => {
      const gen = new Base([], { namespace: 'foo', env }, { unique: true });
      assert.equal(gen.getFeatures().uniqueBy, 'foo');
    });

    it("should return namespace as uniqueBy when unique is 'namespace'", () => {
      const gen = new Base(
        [],
        {
          namespace: 'foo',
          env,
        },
        {
          unique: 'namespace',
        },
      );
      assert.equal(gen.getFeatures().uniqueBy, 'foo');
    });

    it("should return namespace with first argument as uniqueBy when unique is 'namespace'", () => {
      const gen = new Base(
        ['bar'],
        {
          namespace: 'foo',
          env,
        },
        {
          unique: 'argument',
        },
      );
      assert.equal(gen.getFeatures().uniqueBy, 'foo#bar');
    });
  });

  describe('getTaskNames', () => {
    class TestGen extends Base {
      constructor(args, options, features) {
        const customPriorities = [{ priorityName: 'customPriority', before: 'prompting' }];
        super(
          args,
          Array.isArray(args)
            ? options
            : {
                ...options,
                customPriorities,
              },
          Array.isArray(args)
            ? {
                ...features,
                customPriorities,
              }
            : features,
        );
      }

      anyMethod() {}
      default() {}
      customPriority() {}
    }
    it('should return any public member when tasksMatchingPriority is undefined', () => {
      const gen = new TestGen(
        [],
        {
          namespace: 'foo',
          env,
        },
        {},
      );
      assert.deepStrictEqual(gen.getTaskNames(), ['anyMethod', 'default', 'customPriority']);
    });

    it('should return any public member when tasksMatchingPriority is false', async () => {
      const Gen = helpers.createDummyGenerator(class extends TestGen {}, {
        default() {},
        customPriority() {},
        otherMethod() {},
      });
      assert.deepStrictEqual(new Gen({ env }).getTaskNames(), ['default', 'customPriority', 'otherMethod']);
    });

    it('should return only priorities tasks when tasksMatchingPriority is true', async () => {
      const Gen = class extends TestGen {
        constructor(args, options, features) {
          super(args, options, { ...features, tasksMatchingPriority: true });
        }

        default() {}

        customPriority() {}

        otherMethod() {}
      };

      assert.deepStrictEqual(new Gen([], { env }).getTaskNames(), ['default', 'customPriority']);
    });

    it('should return only inherited tasks when inheritTasks is true', async () => {
      const Gen = class extends TestGen {
        constructor(args, options, features) {
          super(args, options, { ...features, inheritTasks: true });
        }

        default() {}

        initializing() {}
      };

      const gen = new Gen([], { env });
      assert.deepStrictEqual(gen.getTaskNames(), ['default', 'customPriority', 'initializing']);
      assert.strictEqual(
        gen.getTaskSourcesPropertyDescriptors().default.value,
        Object.getOwnPropertyDescriptor(Object.getPrototypeOf(gen), 'default')!.value,
      );
    });

    it('passing taskPrefix should return tasks without taskPrefix', async () => {
      const Gen = class extends TestGen {
        constructor(args, options, features) {
          super(args, options, { ...features, taskPrefix: 'foo' });
        }

        foodefault() {}

        foobar() {}
      };

      const gen = new Gen([], { env });
      assert.deepStrictEqual(gen.getTaskNames(), ['default', 'bar']);
    });

    it('passing taskPrefix and inheritTasks should return tasks without taskPrefix', async () => {
      const Parent = class extends TestGen {
        constructor(args, options, features) {
          super(args, options, { ...features, taskPrefix: 'foo', inheritTasks: true });
        }

        foodefault() {}
      };
      const Gen = class extends Parent {
        constructor(args, options, features) {
          super(args, options, { ...features, taskPrefix: 'foo', inheritTasks: true });
        }

        fooinitializing() {}
      };

      const gen = new Gen([], { env });
      assert.deepStrictEqual(gen.getTaskNames(), ['default', 'initializing']);
    });
  });
});
