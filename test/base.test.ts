/* eslint-disable @typescript-eslint/no-unused-expressions, @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import fs, { mkdirSync, rmSync } from 'node:fs';
import os from 'node:os';
import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import process from 'node:process';
import { Buffer } from 'node:buffer';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { passthrough } from '@yeoman/transform';
import Environment, { type EnvironmentOptions } from 'yeoman-environment';
import helpers from 'yeoman-test';
import { TestAdapter } from '@yeoman/adapter/testing';
import type { TestGeneratorOptions } from './utils.js';
import Base from './utils.js';
import type { BaseFeatures } from '../src/types.js';

const require = createRequire(import.meta.url);

const _filename = fileURLToPath(import.meta.url);
const _dirname = dirname(_filename);

const resolveddir = path.join(os.tmpdir(), 'yeoman-base-generator');
const createEnv = (options?: Partial<EnvironmentOptions>) =>
  new Environment({ skipInstall: true, adapter: new TestAdapter(), ...options });

describe('Base', () => {
  let env: Environment;
  let Dummy: typeof Base;
  let dummy: Base;

  beforeEach(async () => {
    await helpers.prepareTemporaryDir().run();

    mkdirSync('yeoman-base');
    process.chdir('yeoman-base');

    env = createEnv();
    // Ignore error forwarded to environment
    env.on('error', _ => {});

    mkdirSync(resolveddir, { recursive: true });
    Dummy = class extends Base {};
    Dummy.prototype.exec = vi.fn();

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

      expect(process.cwd()).toBe(subdir);
      expect(dummy.destinationPath()).toBe(subdir);
      expect(dummy.contextRoot).toBe(subdir);
    });

    it('use the environment options', async () => {
      env.register(class extends Base {}, { namespace: 'ember:model' });

      const generator = await env.create('ember:model', {
        generatorOptions: {
          'test-framework': 'jasmine',
        },
      });

      expect(generator.options['test-framework']).toBe('jasmine');
    });

    it('set generator.options from constructor options', () => {
      const generator = new Base({
        env,
        resolved: 'test',
        'test-framework': 'mocha',
      });

      expect(generator.options['test-framework']).toBe('mocha');
    });

    it('set options based on nopt arguments', () => {
      const generator = new Base<any>(['--foo', 'bar'], {
        env,
        resolved: 'test',
      });

      generator.option('foo');
      expect(generator.options.foo).toBe(true);
      expect(generator.args).toEqual(['bar']);
    });

    it('set arguments based on nopt arguments', () => {
      const generator = new Base<any>(['--foo', 'bar'], {
        env,
        resolved: 'test',
      });

      generator.option('foo');
      generator.argument('baz');
      expect(generator.options.baz).toBe('bar');
    });

    it('set options with false values', async () => {
      const runResult = await helpers
        .create(path.join(_dirname, './fixtures/options-generator'), { namespace: 'options-generator' }, { createEnv })
        .withOptions({ testOption: false })
        .run();

      expect(runResult.env.rootGenerator().options.testOption).toBe(false);
    });

    it('setup fs editor', () => {
      const generator = new Base([], {
        env,
        resolved: 'test',
      });

      expect(generator.fs).toBeTruthy();
    });

    it('setup required fields for a working generator for help', () => {
      const generator = new Base([], {
        env,
        help: true,
        resolved: 'test',
      });

      expect(generator.env).toBeTruthy();
      expect(generator.fs).toBeTruthy();
      expect(generator._debug).toBeTruthy();
      expect(generator._).toBeTruthy();

      generator.option('foo');
      generator.argument('baz');
    });

    it('should not fail without an env for help', () => {
      const generator = new Base([], {
        help: true,
        resolved: 'test',
      });

      expect(generator._debug).toBeTruthy();
      expect(generator._).toBeTruthy();

      generator.option('foo');
      generator.argument('baz');
    });
  });

  describe('prototype', () => {
    it("methods doesn't conflict with Env#runQueue", () => {
      for (const queue of (env as any).runLoop.queueNames) {
        expect((Base.prototype as any)[queue]).toBeFalsy();
      }
    });
  });

  describe('#appname', () => {
    it('is set to the `determineAppname()` return value', () => {
      expect(dummy.appname).toBe(dummy.determineAppname());
    });
  });

  describe('#determineAppname()', () => {
    afterEach(() => {
      rmSync('bower.json', { force: true });
      rmSync('package.json', { force: true });
    });

    it('returns appname from package.json', () => {
      dummy.fs.write(dummy.destinationPath('package.json'), '{ "name": "package_app-name" }');

      expect(dummy.determineAppname()).toBe('package_app name');
    });

    it('returns appname from the current directory', () => {
      expect(dummy.determineAppname()).toBe('yeoman base');
    });
  });

  describe('#run()', () => {
    let TestGenerator: typeof Base;
    let testGen: Base;
    let execSpy: ReturnType<typeof vi.fn>;
    beforeEach(() => {
      TestGenerator = class extends Base {};
      Object.assign(TestGenerator.prototype, {
        _beforeQueue: vi.fn(),
        exec: vi.fn(),
        exec2: vi.fn(),
        exec3: vi.fn(),
        _private: vi.fn(),
        '#composed': vi.fn(),
        prompting: {
          m1: vi.fn(),
          m2: vi.fn(),
          _private: vi.fn(),
          prop: 'foo',
        },
        initializing: vi.fn(),
      });
      execSpy = TestGenerator.prototype.exec;

      testGen = new TestGenerator([], {
        resolved: 'generator-ember/all/index.js',
        namespace: 'dummy',
        env,
      });
    });

    it('run all methods in the given generator', () => {
      return testGen.run();
    });

    it('turn on _running flag', async () => {
      await testGen.queueTasks();
      expect(testGen._running).toBeTruthy();
    });

    it('should call _beforeQueue', async () => {
      await testGen.queueTasks();
      expect(testGen._beforeQueue).toHaveBeenCalledOnce();
    });

    it('run prototype methods (not instances one)', () => {
      testGen.exec = vi.fn();
      return testGen.run().then(() => {
        expect(execSpy).toHaveBeenCalledOnce();
        expect(testGen.exec).toHaveBeenCalledTimes(0);
      });
    });

    it("don't try running prototype attributes", () => {
      Object.assign(TestGenerator.prototype, { prop: 'something' });
      return testGen.run();
    });

    it('pass instance .args property to the called methods', () => {
      testGen.args = ['2', 'args'];
      return testGen.run().then(() => {
        expect(execSpy).toHaveBeenCalledWith('2', 'args');
      });
    });

    it('can emit error from sync methods', () =>
      new Promise<void>(done => {
        const error = new Error('Some error');

        Object.assign(TestGenerator.prototype, {
          throwing: () => {
            throw error;
          },
        });

        testGen.env.on('error', error_ => {
          expect(error_).toBe(error);
          done();
        });

        testGen.run().catch(() => {});
      }));

    it('stop queue processing once an error is thrown', () => {
      const error = new Error('Some error');
      const spy = vi.fn();

      Object.assign(TestGenerator.prototype, {
        throwing: () => {
          throw error;
        },
        afterError: spy,
      });

      testGen.on('error', vi.fn());
      return testGen.run().catch(error_ => {
        expect(error_).toBe(error);
      });
    });

    it('handle function returning promises as asynchronous', () => {
      const spy1 = vi.fn();
      const spy2 = vi.fn();

      Object.assign(TestGenerator.prototype, {
        first: async () =>
          new Promise<void>(resolve => {
            setTimeout(() => {
              spy1();
              resolve();
            }, 10);
          }),
        second: () => {
          spy2();
        },
      });

      return testGen.run().then(() => {
        expect(spy1.mock.invocationCallOrder[0]).toBeLessThan(spy2.mock.invocationCallOrder[0]);
      });
    });

    it('handle failing promises as errors', () =>
      new Promise<void>(done => {
        Object.assign(TestGenerator.prototype, {
          failing: async () =>
            new Promise((resolve, reject) => {
              reject(new Error('some error'));
            }),
        });

        testGen.env.on('error', error => {
          expect(error.message).toBe('some error');
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
        expect(error.toString().includes('This Generator is empty')).toBeTruthy();
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
        value: vi.fn(),
        configurable: true,
        writable: true,
      });

      const gen = new Generator([], {
        resolved: 'dummy',
        namespace: 'dummy',
        env,
      });

      return gen.run().then(() => {
        expect(gen.nonenumerable).toHaveBeenCalled();
      });
    });

    it('ignore underscore prefixed method', () => {
      return testGen.run().then(() => {
        expect(TestGenerator.prototype._private).not.toHaveBeenCalled();
      });
    });

    it('ignore hashtag prefixed method', () => {
      return testGen.run().then(() => {
        expect(TestGenerator.prototype['#composed']).not.toHaveBeenCalled();
      });
    });

    it('run methods in a queue hash', () => {
      return testGen.run().then(() => {
        expect(TestGenerator.prototype.prompting.m1).toHaveBeenCalledOnce();
        expect(TestGenerator.prototype.prompting.m2).toHaveBeenCalledOnce();
      });
    });

    it('ignore underscore prefixed method in a queue hash', () => {
      return testGen.run().then(() => {
        expect(TestGenerator.prototype.prompting._private).not.toHaveBeenCalled();
      });
    });

    it('run named queued methods in order', () => {
      const initSpy = TestGenerator.prototype.initializing;
      const promptSpy = TestGenerator.prototype.prompting.m1;

      return testGen.run().then(() => {
        expect(initSpy.mock.invocationCallOrder[0]).toBeLessThan(promptSpy.mock.invocationCallOrder[0]);
      });
    });

    it('run queued methods in order even if not in order in prototype', () => {
      const initSpy = TestGenerator.prototype.initializing;
      const execSpy = TestGenerator.prototype.exec;

      return testGen.run().then(() => {
        expect(initSpy.mock.invocationCallOrder[0]).toBeLessThan(execSpy.mock.invocationCallOrder[0]);
      });
    });

    it('commit mem-fs to disk', () => {
      let filepath: string | undefined;

      Object.assign(TestGenerator.prototype, {
        writing(this: Base) {
          this.fs.write((filepath = path.join(this.destinationRoot(), 'fromfs.txt')), 'generated');
        },
      });

      return testGen.run().then(() => {
        expect(fs.existsSync(filepath!)).toBeTruthy();
      });
    });

    it('allow skipping file writes to disk', () => {
      const action = { action: 'skip' };
      const filepath = path.join(_dirname, '/fixtures/conflict.js');
      expect(fs.existsSync(filepath)).toBeTruthy();

      Object.assign(TestGenerator.prototype, {
        writing(this: Base) {
          this.fs.write(filepath, 'some new content');
        },
      });

      const env = createEnv({ adapter: new TestAdapter({ mockedAnswers: action }) });
      const testGen = new TestGenerator([], {
        resolved: 'generator/app/index.js',
        namespace: 'dummy',
        env,
      });

      return testGen.run().then(() => {
        expect(fs.readFileSync(filepath, 'utf8')).toBe('var a = 1;\n');
      });
    });

    it('allows file writes in any priorities', () => {
      Object.assign(TestGenerator.prototype, {
        end(this: Base) {
          this.fs.write(this.destinationPath('foo.txt'), 'test');
        },
      });

      return testGen.run().then(() => {
        expect(fs.existsSync(testGen.destinationPath('foo.txt'))).toBeTruthy();
      });
    });

    it('can cancel cancellable tasks', () =>
      new Promise<void>(done => {
        Object.assign(TestGenerator.prototype, {
          cancel(this: Base) {
            this.cancelCancellableTasks();
          },
          throwing: () => {
            throw new Error('not thrown');
          },
        });

        testGen.run().then(done);
      }));

    it('can start over the generator', () =>
      new Promise<void>(done => {
        const spy1 = vi.fn();
        const spy2 = vi.fn();

        Object.assign(TestGenerator.prototype, {
          cancel(this: Base) {
            spy1();
            if (!this.startedOver) {
              this.startOver({ startedOver: true });
              this.startedOver = true;
            }
          },
          after(this: Base) {
            expect(this.options.startedOver).toBeTruthy();
            expect(this.startedOver).toBeTruthy();
            spy2();
          },
        });

        testGen.run().then(() => {
          expect(spy1).toHaveBeenCalledTimes(2);
          expect(spy2).toHaveBeenCalledOnce();
          done();
        });
      }));

    it('can queue a method again', () =>
      new Promise<void>(done => {
        const spy1 = vi.fn();

        Object.assign(TestGenerator.prototype, {
          cancel(this: Base) {
            spy1();
            if (!this.startedOver) {
              this.queueOwnTask('cancel');
              this.startOver();
              this.startedOver = true;
            }
          },
        });

        testGen.run().then(() => {
          expect(spy1).toHaveBeenCalledTimes(2);
          done();
        });
      }));
  });

  describe('#run() with task prefix', () => {
    let TestGenerator: typeof Base;
    let testGen: Base;

    beforeEach(() => {
      TestGenerator = class extends Base {};
      Object.assign(TestGenerator.prototype, {
        beforeQueue: vi.fn(),
        _private: vi.fn(),
        '#composed': vi.fn(),
        composed: vi.fn(),
        '#initializing': vi.fn(),
        initializing: vi.fn(),
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
      expect(TestGenerator.prototype['#composed']).toHaveBeenCalledOnce();
      expect(TestGenerator.prototype.composed).not.toHaveBeenCalled();
      expect(TestGenerator.prototype['#initializing']).toHaveBeenCalledOnce();
      expect(TestGenerator.prototype.initializing).not.toHaveBeenCalled();
      expect(TestGenerator.prototype._private).not.toHaveBeenCalled();
    });

    it('should call beforeQueue', async () => {
      await testGen.queueTasks();
      expect(testGen.beforeQueue).toHaveBeenCalledOnce();
    });
  });

  describe('#argument()', () => {
    it('add a new argument to the generator instance', () => {
      expect(dummy._arguments.length).toBe(0);
      dummy.argument('foo');
      expect(dummy._arguments.length).toBe(1);
    });

    it('create the property specified with value from positional args', () => {
      dummy.argument('foo');
      expect(dummy.options.foo).toBe('bar');
    });

    it('allows specifying default argument values', () => {
      const Generator = class extends Base {
        constructor(args?: string[], options?: TestGeneratorOptions) {
          super(args, options);

          this.argument('bar', { default: 'baz' });
        }
      };

      const gen = new Generator([], {
        env,
      });

      expect(gen.options.bar).toBe('baz');
    });

    it('allows specifying default argument values', () => {
      const Generator = class extends Base<any> {
        constructor(args?: string[], options?: TestGeneratorOptions) {
          super(args, options);

          this.argument('bar', { default: 'baz' });
        }
      };

      const gen = new Generator([], {
        env,
        resolved: 'test',
      });

      expect(gen.options.bar).toBe('baz');
    });

    it('properly uses arguments values passed from constructor', () => {
      const Generator = class extends Base {
        constructor(args?: string[], options?: TestGeneratorOptions) {
          super(args, options);

          this.argument('bar', { default: 'baz' });
        }
      };

      const gen = new Generator({
        env,
        resolved: 'test',
        bar: 'foo',
      });

      expect(gen.options.bar).toBe('foo');
    });

    it('slice positional arguments when config.type is Array', () => {
      dummy.argument('bar', { type: Array });
      expect(dummy.options.bar).toEqual(['bar', 'baz', 'bom']);
    });

    it('raise an error if required arguments are not provided', () =>
      new Promise<void>(done => {
        const dummy = new Base([], {
          env,
          resolved: 'dummy/all',
        });

        try {
          dummy.argument('foo', { required: true });
        } catch (error) {
          expect(error.message.startsWith('Did not provide required argument ')).toBeTruthy();
          done();
        }
      }));

    it("doesn't raise an error if required arguments are not provided, but the help option has been specified", () => {
      const dummy = new Base([], {
        env,
        resolved: 'dummy:all',
        help: true,
      });

      expect(dummy._arguments.length).toBe(0);
      expect(dummy.argument.bind(dummy, 'foo', { required: true })).not.toThrow();
      expect(dummy._arguments.length).toBe(1);
    });

    it('can be called before #option()', () => {
      const dummy = new Base(['--foo', 'bar', 'baz'], {
        env,
        resolved: 'dummy/all',
      });

      dummy.argument('baz');
      dummy.option('foo', { type: String });

      expect(dummy.options.baz).toBe('baz');
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
      expect(generator._options.foo).toEqual({
        description: 'Description for foo',
        name: 'foo',
        type: Boolean,
        hide: false,
      });
    });

    it('allow aliasing options', () => {
      const Generator = class extends Base {
        constructor(args?: string[], options?: TestGeneratorOptions) {
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

      expect(gen.options['long-name']).toBe('that value');
    });

    it('allows Boolean options to be undefined', () => {
      const Generator = class extends Base {
        constructor(args?: string[], options?: TestGeneratorOptions) {
          super(args, options);

          this.option('undef', { type: Boolean });
        }
      };

      const gen = new Generator([], {
        env,
        resolved: 'test',
      });

      expect(gen.options.undef).toBe(undefined);
    });

    it('disallows Boolean options starting with no-', () => {
      const generator = new Dummy([], {
        env,
        resolved: 'test',
      });
      const addWrongOp = () => {
        generator.option('no-op');
      };

      expect(addWrongOp).toThrow(/this\.option\('op', {type: Boolean}\)/);
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
      expect(dummy._prompts[0].name).toBe('foo');
      expect(dummy._prompts[0].message).toBe('bar');
      expect(dummy._prompts[0].type).toBe('number');
    });

    it('should export option', () => {
      dummy.registerConfigPrompts({
        name: 'foo',
        message: 'bar2',
        type: 'string',
        exportOption: true,
      });
      expect(dummy._prompts[0].name).toBe('foo');
      expect(dummy._prompts[0].message).toBe('bar2');
      expect(dummy._prompts[0].type).toBe('string');
      expect(dummy._options.foo.name).toBe('foo');
      expect(dummy._options.foo.description).toBe('bar2');
      expect(dummy._options.foo.type).toBe(String);
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
      expect(dummy._prompts[0].name).toBe('foo');
      expect(dummy._prompts[0].message).toBe('bar2');
      expect(dummy._prompts[0].type).toBe('string');
      expect(dummy._options.foo2.name).toBe('foo2');
      expect(dummy._options.foo2.description).toBe('bar3');
      expect(dummy._options.foo2.type).toBe(Number);
    });
  });

  describe('#registerPriorities()', () => {
    it('adds a new priority', () => {
      const priority = {
        priorityName: 'foo',
        before: 'initializing',
      };
      dummy.registerPriorities([priority]);
      expect(dummy._queues.foo).toBeTruthy();
    });
    it('edits a existing priority', () => {
      const priority = {
        priorityName: 'initializing',
        args: 'an arg array',
      };
      dummy.registerPriorities([priority]);
      expect(dummy._queues.initializing.args).toBe('an arg array');
      expect(dummy._queues.initializing.edit).toBe(undefined);
    });
  });

  describe('#executeTask()', () => {
    it('should execute the task passing priority args', () => {
      const priority = {
        priorityName: 'initializing',
        args: ['an arg array'],
      };
      dummy.registerPriorities([priority]);

      const task = vi.fn();
      dummy.executeTask({
        queueName: 'dummy#initializing',
        method: task,
        taskName: 'testTask',
      });
      expect(task).toHaveBeenCalledWith('an arg array');
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
      expect(dummy.options.foo).toBe('bar');
    });

    it('set generator alias options', () => {
      dummy.parseOptions();
      expect(dummy.options.shortOpt).toBe('baz');
    });

    it('set args to what remains', () => {
      dummy.parseOptions();
      expect(dummy.args).toEqual(['start', 'remain']);
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
      expect(dummy.options.foo).toBe(undefined);
    });
  });

  describe('#composeWith()', () => {
    let spy: ReturnType<typeof vi.fn>;
    let GenCompose: typeof Base;
    beforeEach(() => {
      dummy = new Dummy([], {
        resolved: 'unknown',
        namespace: 'dummy',
        env,
        'skip-install': true,
        'force-install': true,
        'skip-cache': true,
      });

      spy = vi.fn();
      GenCompose = class extends Base {};
      GenCompose.prototype.exec = spy;
      env.register(GenCompose, { namespace: 'composed:gen' });
    });

    it('returns the composed generator', async () => {
      expect((await dummy.composeWith('composed:gen')) instanceof GenCompose).toBeTruthy();
    });

    it('runs the composed generators', async () => {
      await dummy.composeWith('composed:gen');

      const runSpy = vi.spyOn(dummy, 'run');
      await dummy.run();
      expect(spy.mock.invocationCallOrder[0]).toBeGreaterThan(runSpy.mock.invocationCallOrder[0]);
    });

    it('runs the composed Generator class in the passed path', async () => {
      const stubPath = path.join(_dirname, 'fixtures/generator-mocha');

      await dummy.composeWith({
        Generator: GenCompose,
        path: stubPath,
      });
      await dummy.run();
      expect(spy.mock.instances[0].options.namespace).toBe('mocha');
      expect(spy.mock.instances[0].options.resolved).toBe(createRequire(import.meta.url).resolve(stubPath));
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
        expect(spy).toHaveBeenCalled();
      });
    });

    it('pass options and arguments to the composed generators', async () => {
      await dummy.composeWith('composed:gen', {
        foo: 'bar',
        'skip-install': true,
      });

      return dummy.run().then(() => {
        expect(spy.mock.instances[0].options.foo).toBe('bar');
      });
    });

    describe('when passing a local path to a generator', () => {
      let stubPath: string;
      let resolvedStub: string;
      let LocalDummy: typeof Base;
      beforeEach(async () => {
        spy = vi.fn();
        dummy.resolved = _filename;
        stubPath = './fixtures/generator-mocha';
        resolvedStub = require.resolve(stubPath);
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
        expect(LocalDummy.prototype.exec).toHaveBeenCalled();
      });

      it('pass options and arguments to the composed generators', async () => {
        await dummy.composeWith(stubPath, {
          foo: 'bar',
          'skip-install': true,
        });
        await dummy.run();
        expect(spy.mock.instances[0].options.foo).toBe('bar');
      });

      it('sets correct metadata on the Generator constructor', async () => {
        await dummy.composeWith(stubPath, {});
        await dummy.run();
        expect(spy.mock.instances[0].options.namespace).toBe('mocha');
        expect(spy.mock.instances[0].options.resolved).toBe(resolvedStub);
      });
    });
  });

  describe('#desc()', () => {
    it('update the internal description', () => {
      dummy.desc('A new desc for this generator');
      expect(dummy.description).toBe('A new desc for this generator');
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
        expect(line.trim().replaceAll(/\s+/g, ' ')).toBe(expected[i]);
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
      expect(usage.trim()).toBe('yo dummy [<baz>] [options]');
    });

    it('returns the expected usage output without arguments', () => {
      dummy._arguments.length = 0;
      const usage = dummy.usage();
      expect(usage.trim()).toBe('yo dummy [options]');
    });

    it('returns the expected usage output without options', () => {
      dummy._arguments.length = 0;
      dummy._options = {};
      const usage = dummy.usage();
      expect(usage.trim()).toBe('yo dummy');
    });
  });

  describe('#config', () => {
    it('provide a storage instance', async () => {
      const module = await import('../src/util/storage.js');
      expect(dummy.config instanceof module.default).toBeTruthy();
    });

    it('is updated when destinationRoot change', () => {
      const getStorageSpy = vi.spyOn(Dummy.prototype, '_getStorage');
      dummy.destinationRoot('foo');

      dummy.config;
      expect(getStorageSpy).toHaveBeenCalledTimes(1);
      dummy.destinationRoot();

      dummy.config;
      expect(getStorageSpy).toHaveBeenCalledTimes(1);
      dummy.destinationRoot('foo');

      dummy.config;
      expect(getStorageSpy).toHaveBeenCalledTimes(2);
      getStorageSpy.mockRestore();
    });
  });

  describe('#templatePath()', () => {
    it('joins path to the source root', () => {
      expect(dummy.templatePath('bar.js')).toBe(path.join(dummy.sourceRoot(), 'bar.js'));
      expect(dummy.templatePath('dir/', 'bar.js')).toBe(path.join(dummy.sourceRoot(), '/dir/bar.js'));
    });
  });

  describe('#destinationPath()', () => {
    it('joins path to the source root', () => {
      expect(dummy.destinationPath('bar.js')).toBe(path.join(dummy.destinationRoot(), 'bar.js'));
      expect(dummy.destinationPath('dir/', 'bar.js')).toBe(path.join(dummy.destinationRoot(), '/dir/bar.js'));
    });
  });

  describe('#queueTransformStream()', () => {
    let TestGenerator;
    let testGen;
    let filepath;

    beforeEach(() => {
      filepath = path.join(os.tmpdir(), '/yeoman-transform-stream/filea.txt');
      TestGenerator = class extends Base {};
      Object.assign(TestGenerator.prototype, { exec: vi.fn() });
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
      Object.assign(TestGenerator.prototype, {
        writing(this: Base) {
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
        },
      });

      return testGen.run().then(() => {
        expect(fs.readFileSync(filepath, 'utf8')).toBe('initializing prompting a b');
      });
    });

    it('add multiple transform streams to the commit stream', () => {
      Object.assign(TestGenerator.prototype, {
        writing(this: Base) {
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
        },
      });

      return testGen.run().then(() => {
        expect(fs.readFileSync(filepath, 'utf8')).toBe('ab');
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
      new Promise<void>(done => {
        const angular = new Generator([], {
          env: createEnv([], {}, new TestAdapter()),
          resolved: _filename,
          'skip-install': true,
        });

        const lifecycle = ['run', 'method:createSomething', 'method:createSomethingElse', 'end'];

        function assertEvent(error) {
          return function () {
            expect(error).toBe(lifecycle.shift());

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
      new Promise<void>(done => {
        class GeneratorOnce extends Base {
          constructor(args?: string[], options?: TestGeneratorOptions) {
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
          expect(isFirstEndEvent).toBeTruthy();

          if (isFirstEndEvent) {
            done();
          }

          isFirstEndEvent = false;
        });

        generatorOnce.run().catch(() => {});
      }));

    it('triggers end event after all generators methods are ran (#709)', () =>
      new Promise<void>(done => {
        const endSpy = vi.fn();
        const GeneratorEnd = class extends Base {
          constructor(args?: string[], options?: TestGeneratorOptions) {
            super(args, options);
            this.on('end', () => {
              expect(endSpy).toHaveBeenCalledOnce();
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
      expect(dummy.rootGeneratorName()).toBe('*');
    });

    it('returns generator name', () => {
      fs.writeFileSync(path.join(resolveddir, 'package.json'), '{ "name": "generator-name" }');
      expect(dummy.rootGeneratorName()).toBe('generator-name');
    });
  });

  describe('#rootGeneratorVersion', () => {
    afterEach(() => {
      rmSync(path.join(resolveddir, 'package.json'), { force: true });
    });

    it('returns the default version', () => {
      expect(dummy.rootGeneratorVersion()).toBe('0.0.0');
    });

    it('returns generator version', () => {
      fs.writeFileSync(path.join(resolveddir, 'package.json'), '{ "version": "1.0.0" }');
      expect(dummy.rootGeneratorVersion()).toBe('1.0.0');
    });
  });

  describe('#queueMethod()', () => {
    let Generator;
    beforeEach(() => {
      Generator = class extends Base {
        constructor(args?: string[], options?: TestGeneratorOptions) {
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
      new Promise<void>(done => {
        const gen = new Generator({
          resolved: resolveddir,
          namespace: 'dummy',
          env,
          testQueue: 'This value',
        });

        gen.run().then(() => {
          expect(gen.queue).toBe('This value');
          done();
        });
      }));

    it('queued method is executed by derived generator', () =>
      new Promise<void>(done => {
        const Derived = class extends Generator {
          constructor(args?: string[], options?: TestGeneratorOptions) {
            super(args, options);

            this.prop = 'a';
          }

          // At least a method is required otherwise will fail. Is this a problem?
          exec() {
            expect(this.prop).toBe('a');
          }

          get initializing() {
            expect(this.prop).toBe('a');
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
          expect(derivedGen.queue).toBe('That value');
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

      const queueTaskSpy = vi.spyOn(env, 'queueTask');
      const noop = () => {};
      gen.queueMethod(noop, 'configuring', noop);

      expect(env.queueTask).toHaveBeenCalledOnce();
      expect('default').toBe(queueTaskSpy.mock.calls[0][0]);
    });

    it('queued method with object, queueName and reject', () => {
      const env = createEnv([], { 'skip-install': true }, new TestAdapter());
      const gen = new Generator({
        resolved: resolveddir,
        namespace: 'dummy',
        env,
        testQueue: 'This value',
      });

      const queueTaskSpy = vi.spyOn(env, 'queueTask');
      const noop = () => {};
      const queueName = 'configuring';
      const tasks = {
        foo() {},
      };
      gen.queueMethod(tasks, queueName, noop);

      expect(env.queueTask).toHaveBeenCalledOnce();
      expect(queueName).toBe(queueTaskSpy.mock.calls[0][0]);
    });
  });

  describe('#queueTask()', () => {
    let Generator;
    beforeEach(() => {
      Generator = class extends Base {
        constructor(args?: string[], options?: TestGeneratorOptions) {
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

      const queueTaskSpy = vi.spyOn(env, 'queueTask');
      const method = vi.fn();
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

      expect(env.queueTask).toHaveBeenCalledOnce();
      expect(queueName).toBe(queueTaskSpy.mock.calls[0][0]);
      expect(queueTaskSpy.mock.calls[0][2]).toStrictEqual({
        once: taskName,
        startQueue: false,
      });

      await gen.run();
      expect(method).toHaveBeenCalledOnce();
      expect(arg).toBe(method.mock.calls[0][0]);
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
      expect(thrown).toBe(true);
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
    let TestGenerator: typeof Base;
    let testGen: InstanceType<typeof Base>;

    beforeEach(() => {
      TestGenerator = class extends Base {
        constructor(args?: string[], options?: TestGeneratorOptions, features?: BaseFeatures) {
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
      Object.assign(TestGenerator.prototype, {
        assert() {
          expect(this._queues).toStrictEqual({
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
          expect(env.runLoop.queueNames).toStrictEqual([
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
      const prePrompting1 = vi.fn();
      const preConfiguring1 = vi.fn();
      const preConfiguring2 = vi.fn();
      const afterEnd = vi.fn();

      const initializing = vi.fn();
      const prompting = vi.fn();
      const configuring = vi.fn();
      const end = vi.fn();

      Object.assign(TestGenerator.prototype, {
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
        expect(initializing.mock.invocationCallOrder[0]).toBeLessThan(preConfiguring1.mock.invocationCallOrder[0]);
        expect(preConfiguring1.mock.invocationCallOrder[0]).toBeLessThan(preConfiguring2.mock.invocationCallOrder[0]);
        expect(preConfiguring2.mock.invocationCallOrder[0]).toBeLessThan(configuring.mock.invocationCallOrder[0]);
        expect(configuring.mock.invocationCallOrder[0]).toBeLessThan(prePrompting1.mock.invocationCallOrder[0]);
        expect(prePrompting1.mock.invocationCallOrder[0]).toBeLessThan(prompting.mock.invocationCallOrder[0]);
        expect(prompting.mock.invocationCallOrder[0]).toBeLessThan(end.mock.invocationCallOrder[0]);
        expect(end.mock.invocationCallOrder[0]).toBeLessThan(afterEnd.mock.invocationCallOrder[0]);
      });
    });

    it('correctly run custom priority with once option', async () => {
      const commonPreConfiguring = vi.fn();
      const customPreConfiguring1 = vi.fn();
      const customPreConfiguring2 = vi.fn();

      Object.assign(TestGenerator.prototype, {
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
      });

      await testGen.composeWith({
        Generator: TestGenerator3,
        path: 'unknown',
      });

      return testGen.run().then(() => {
        expect(commonPreConfiguring).toHaveBeenCalledOnce();
        expect(customPreConfiguring1).toHaveBeenCalledOnce();
        expect(customPreConfiguring2).toHaveBeenCalledOnce();
      });
    });
  });

  describe('Custom priorities errors', () => {
    it('error is thrown with duplicate custom queue', () => {
      const TestGenerator = class extends Base {
        constructor(args?: string[], options?: TestGeneratorOptions) {
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

      expect(
        () =>
          new TestGenerator([], {
            resolved: 'generator-ember/all/index.js',
            namespace: 'dummy',
            env,
          }),
      ).toThrow();
    });
  });

  describe('#prompt', () => {
    let promptSpy: ReturnType<typeof vi.spyOn>;
    const input1Prompt = { type: 'input', name: 'prompt1', message: 'dummy' } as const;
    const input2Prompt = { type: 'input', name: 'prompt2', message: 'dummy' } as const;
    beforeEach(() => {
      dummy.env.adapter = new TestAdapter({
        mockedAnswers: {
          prompt1: 'prompt1NewValue',
          prompt2: 'prompt2NewValue',
        },
      });
      promptSpy = vi.spyOn(dummy.env.adapter, 'prompt');
      dummy.options.askAnswered = true;
      dummy.config.set('prompt1', 'prompt1Value');
      dummy.config.set('prompt2', 'prompt2Value');
      dummy.config.set('notUsed', 'notUsedValue');
    });
    afterEach(() => {
      promptSpy.mockRestore();
    });

    it('passes config value as answer to adapter', () => {
      const expectedAnswers = { prompt1: 'prompt1Value' };
      return dummy.prompt(input1Prompt, dummy.config).then(_ => {
        expect(promptSpy.mock.calls[0][1]).toEqual(expectedAnswers);
      });
    });

    it('passes config values as answers to adapter', () => {
      const expectedAnswers = {
        prompt1: 'prompt1Value',
        prompt2: 'prompt2Value',
      };
      return dummy.prompt([input1Prompt, input2Prompt], dummy.config).then(_ => {
        expect(promptSpy.mock.calls[0][1]).toEqual(expectedAnswers);
      });
    });

    it('passes config values as the question default', () => {
      return dummy.prompt([input1Prompt, input2Prompt], dummy.config).then(_ => {
        const [[prompts, answers]] = promptSpy.mock.calls;
        expect(prompts[0].default(answers)).toEqual('prompt1Value');
        expect(prompts[1].default(answers)).toEqual('prompt2Value');
      });
    });

    it('saves answers to config', () => {
      return dummy.prompt([input1Prompt, input2Prompt], dummy.config).then(answers => {
        expect(answers.prompt1).toBe('prompt1NewValue');
        expect(answers.prompt2).toBe('prompt2NewValue');
        expect(dummy.config.get('prompt1')).toBe('prompt1NewValue');
        expect(dummy.config.get('prompt2')).toBe('prompt2NewValue');
      });
    });

    it('saves answers to config when specified as a property name', () => {
      return dummy.prompt([{ ...input1Prompt, storage: 'config' }, input2Prompt]).then(answers => {
        expect(answers.prompt1).toBe('prompt1NewValue');
        expect(answers.prompt2).toBe('prompt2NewValue');
        expect(dummy.config.get('prompt1')).toBe('prompt1NewValue');
        expect(dummy.config.get('prompt2')).toBe('prompt2Value');
      });
    });

    it('saves answers to specific storage', () => {
      return dummy.prompt([{ ...input1Prompt, storage: dummy.config }, input2Prompt]).then(answers => {
        expect(answers.prompt1).toBe('prompt1NewValue');
        expect(answers.prompt2).toBe('prompt2NewValue');
        expect(dummy.config.get('prompt1')).toBe('prompt1NewValue');
        expect(dummy.config.get('prompt2')).toBe('prompt2Value');
      });
    });

    it('passes correct askAnswered option to adapter', () => {
      return dummy.prompt([input1Prompt], dummy.config).then(_ => {
        expect(promptSpy.mock.calls[0][0][0].askAnswered).toEqual(true);
      });
    });
  });

  describe('feature', () => {
    it('should not override existing features', () => {
      class Dummy extends Base {
        customFeatures = { foo: true } as BaseFeatures;
      }

      const gen = new Dummy([], { env }, { bar: true });

      expect(gen.customFeatures.foo).toBe(true);
      expect(gen.customFeatures.bar).toBe(undefined);
      expect(gen.features.foo).toBe(true);
      expect(gen.features.bar).toBe(true);
    });
  });

  describe('#features', () => {
    it('should return namespace as uniqueBy when unique is true', () => {
      const gen = new Base([], { namespace: 'foo', env }, { unique: true });
      expect(gen.features.uniqueBy).toBe('foo');
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
      expect(gen.features.uniqueBy).toBe('foo');
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
      expect(gen.features.uniqueBy).toBe('foo#bar');
    });
  });

  describe('getTaskNames', () => {
    class TestGen extends Base {
      constructor(args?: string[], options?: TestGeneratorOptions, features?: BaseFeatures) {
        const customPriorities = [{ priorityName: 'customPriority', before: 'prompting' }] as const;
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
      expect(gen.getTaskNames()).toStrictEqual(['anyMethod', 'default', 'customPriority']);
    });

    it('should return any public member when tasksMatchingPriority is false', async () => {
      const Gen = helpers.createDummyGenerator(class extends TestGen {}, {
        default() {},
        customPriority() {},
        otherMethod() {},
      });
      expect(new Gen({ env }).getTaskNames()).toStrictEqual(['default', 'customPriority', 'otherMethod']);
    });

    it('should return only priorities tasks when tasksMatchingPriority is true', async () => {
      const Gen = class extends TestGen {
        constructor(args?: string[], options?: TestGeneratorOptions, features?: BaseFeatures) {
          super(args, options, { ...features, tasksMatchingPriority: true });
        }

        default() {}

        customPriority() {}

        otherMethod() {}
      };

      expect(new Gen([], { env }).getTaskNames()).toStrictEqual(['default', 'customPriority']);
    });

    it('should return only inherited tasks when inheritTasks is true', async () => {
      const Gen = class extends TestGen {
        constructor(args?: string[], options?: TestGeneratorOptions, features?: BaseFeatures) {
          super(args, options, { ...features, inheritTasks: true });
        }

        default() {}

        initializing() {}
      };

      const gen = new Gen([], { env });
      expect(gen.getTaskNames()).toStrictEqual(['default', 'customPriority', 'initializing']);
      expect(gen.getTaskSourcesPropertyDescriptors().default.value).toBe(
        Object.getOwnPropertyDescriptor(Object.getPrototypeOf(gen), 'default')!.value,
      );
    });

    it('passing taskPrefix should return tasks without taskPrefix', async () => {
      const Gen = class extends TestGen {
        constructor(args?: string[], options?: TestGeneratorOptions, features?: BaseFeatures) {
          super(args, options, { ...features, taskPrefix: 'foo' });
        }

        foodefault() {}

        foobar() {}
      };

      const gen = new Gen([], { env });
      expect(gen.getTaskNames()).toStrictEqual(['default', 'bar']);
    });

    it('passing taskPrefix and inheritTasks should return tasks without taskPrefix', async () => {
      const Parent = class extends TestGen {
        constructor(args?: string[], options?: TestGeneratorOptions, features?: BaseFeatures) {
          super(args, options, { ...features, taskPrefix: 'foo', inheritTasks: true });
        }

        foodefault() {}
      };
      const Gen = class extends Parent {
        constructor(args?: string[], options?: TestGeneratorOptions, features?: BaseFeatures) {
          super(args, options, { ...features, taskPrefix: 'foo', inheritTasks: true });
        }

        fooinitializing() {}
      };

      const gen = new Gen([], { env });
      expect(gen.getTaskNames()).toStrictEqual(['default', 'initializing']);
    });
  });
});
