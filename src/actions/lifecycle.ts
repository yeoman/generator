import assert from 'node:assert';
import { type Transform } from 'node:stream';
import { dirname, isAbsolute, resolve as pathResolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { stat } from 'node:fs/promises';
import createDebug from 'debug';
import chalk from 'chalk';
import type { Task, TaskOptions, BaseOptions, Priority } from '../types.js';
import type Generator from '../index.js';
import type BaseGenerator from '../generator.js';

const debug = createDebug('yeoman:generator');

type TaskStatus = {
  cancelled: boolean;
  timestamp: Date;
};

// Ensure a prototype method is a candidate run by default
const methodIsValid = function (name: string) {
  return !name.startsWith('_') && name !== 'constructor';
};

export class TasksMixin {
  _composedWith!: any[];
  // Queues map: generator's queue name => grouped-queue's queue name (custom name)
  readonly _queues!: Record<string, Priority>;

  runningState?: { namespace: string; queueName: string; methodName: string };
  _taskStatus?: TaskStatus;

  /**
   * Register priorities for this generator
   */
  registerPriorities(this: BaseGenerator, priorities: Priority[]) {
    priorities = priorities.filter(priority => {
      if (priority.edit) {
        const queue = this._queues[priority.priorityName];
        if (!queue) {
          throw new Error(`Error editing priority ${priority.priorityName}, not found`);
        }

        Object.assign(queue, { ...priority, edit: undefined });
      }

      return !priority.edit;
    });

    const customPriorities = priorities.map(customPriority => ({ ...customPriority }));
    // Sort customPriorities, a referenced custom queue must be added before the one that reference it.
    customPriorities.sort((a, b) => {
      if (a.priorityName === b.priorityName) {
        throw new Error(`Duplicate custom queue ${a.priorityName}`);
      }

      if (a.priorityName === b.before) {
        return -1;
      }

      if (b.priorityName === a.before) {
        return 1;
      }

      return 0;
    });

    for (const customQueue of customPriorities) {
      customQueue.queueName = customQueue.queueName ?? `${this._namespace}#${customQueue.priorityName}`;
      debug(`Registering custom queue ${customQueue.queueName}`);
      this._queues[customQueue.priorityName] = customQueue;

      const beforeQueue = customQueue.before ? this._queues[customQueue.before].queueName : undefined;
      this.env.addPriority(customQueue.queueName, beforeQueue);
    }
  }

  /**
   * Schedule methods on a run queue.
   *
   * @param method: Method to be scheduled or object with function properties.
   * @param methodName Name of the method (task) to be scheduled.
   * @param queueName Name of the queue to be scheduled on.
   * @param reject Reject callback.
   */
  queueMethod(method: Task['method'], methodName: string, queueName: Task['queueName'], reject: Task['reject']): void;
  queueMethod(
    method: Record<string, Task['method']>,
    methodName: string | Task['reject'],
    reject?: Task['reject'],
  ): void;
  // eslint-disable-next-line max-params
  queueMethod(
    this: BaseGenerator,
    method: Task['method'] | Record<string, Task['method']>,
    methodName: string | Task['reject'],
    queueName?: Task['queueName'] | Task['reject'],
    reject?: Task['reject'],
  ): void {
    if (typeof queueName === 'function') {
      reject = queueName;
      queueName = undefined;
    } else {
      queueName = queueName ?? 'default';
    }

    if (typeof method !== 'function') {
      if (typeof methodName === 'function') {
        reject = methodName;
        methodName = undefined;
      }

      this.queueTaskGroup(method, {
        queueName: methodName,
        reject,
      });
      return;
    }

    this.queueTask({
      method,
      taskName: methodName as string,
      queueName,
      reject,
    });
  }

  /**
   * Schedule tasks from a group on a run queue.
   *
   * @param taskGroup: Object containing tasks.
   * @param taskOptions options.
   */
  queueTaskGroup(this: BaseGenerator, taskGroup: Record<string, Task['method']>, taskOptions: TaskOptions): void {
    for (const task of this.extractTasksFromGroup(taskGroup, taskOptions)) {
      this.queueTask(task);
    }
  }

  /**
   * Extract tasks from a priority.
   *
   * @param name: The method name to schedule.
   */
  extractTasksFromPriority(this: BaseGenerator, name: string, taskOptions: TaskOptions = {}): Task[] {
    const priority = this._queues[name];
    taskOptions = {
      ...priority,
      cancellable: true,
      run: false,
      ...taskOptions,
    };

    if (taskOptions.auto && priority && priority.skip) {
      return [];
    }

    const { taskPrefix = this.features.taskPrefix ?? '' } = taskOptions;
    const propertyName = `${taskPrefix}${name}`;
    const property = Object.getOwnPropertyDescriptor(
      taskOptions.taskOrigin || Object.getPrototypeOf(this),
      propertyName,
    );
    if (!property) return [];

    const item: Task['method'] = property.value ?? property.get?.call(this);

    // Name points to a function; single task
    if (typeof item === 'function') {
      return [{ ...taskOptions, taskName: name, method: item }];
    }

    if (!item || !priority) {
      return [];
    }

    return this.extractTasksFromGroup(item, taskOptions);
  }

  /**
   * Extract tasks from group.
   *
   * @param group Task group.
   * @param taskOptions options.
   */
  extractTasksFromGroup(group: Record<string, Task['method']>, taskOptions: TaskOptions): Task[] {
    return Object.entries(group)
      .map(([taskName, method]) => {
        if (typeof method !== 'function' || !methodIsValid(taskName)) return;
        return {
          ...taskOptions,
          method,
          taskName,
        };
      })
      .filter(Boolean) as Task[];
  }

  /**
   * Schedule a generator's method on a run queue.
   *
   * @param name: The method name to schedule.
   * @param taskOptions options.
   */
  queueOwnTask(this: BaseGenerator, name: string, taskOptions: TaskOptions): void {
    for (const task of this.extractTasksFromPriority(name, taskOptions)) this.queueTask(task);
  }

  /**
   * Get task names.
   */
  getTaskNames(this: BaseGenerator): string[] {
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(this));
    let validMethods = methods.filter(methodIsValid);
    const { taskPrefix } = this.features;

    if (taskPrefix) {
      validMethods = validMethods
        .filter(method => method.startsWith(taskPrefix))
        .map(method => method.slice(taskPrefix.length));
    } else {
      validMethods = validMethods.filter(method => !method.startsWith('#'));
    }

    if (this.features.tasksMatchingPriority) {
      const queueNames = Object.keys(this._queues);
      validMethods = validMethods.filter(method => queueNames.includes(method));
    }

    return validMethods;
  }

  /**
   * Schedule every generator's methods on a run queue.
   */
  queueOwnTasks(this: BaseGenerator, taskOptions: TaskOptions): void {
    this._running = true;
    this._taskStatus = { cancelled: false, timestamp: new Date() };

    const validMethods = this.getTaskNames();
    if (validMethods.length === 0 && this._prompts.length === 0) {
      throw new Error('This Generator is empty. Add at least one method for it to run.');
    }

    if (this._prompts.length > 0) {
      this.queueTask({
        method: async () => this.prompt(this._prompts, this.config),
        taskName: 'Prompt registered questions',
        queueName: 'prompting',
        cancellable: true,
      });

      if (validMethods.length === 0) {
        this.queueTask({
          method: () => {
            (this as any).renderTemplate();
          },
          taskName: 'Empty generator: copy templates',
          queueName: 'writing',
          cancellable: true,
        });
      }
    }

    for (const methodName of validMethods) this.queueOwnTask(methodName, taskOptions);

    this.emit('queueOwnTasks');
  }

  /**
   * Schedule tasks on a run queue.
   *
   * @param task: Task to be queued.
   */
  queueTask(this: BaseGenerator, task: Task): void {
    const { queueName = 'default', taskName: methodName, run, once } = task;

    const { _taskStatus: taskStatus, _namespace: namespace } = this;

    debug(`Queueing ${namespace}#${methodName} with options %o`, { ...task, method: undefined });
    this.env.queueTask(queueName, async () => this.executeTask(task, undefined, taskStatus), {
      once: once ? methodName : undefined,
      startQueue: run,
    });
  }

  /**
   * Execute a task.
   *
   * @param task: Task to be executed.
   * @param args: Task arguments.
   * @param taskStatus.
   */
  async executeTask(
    this: BaseGenerator,
    task: Task,
    args = task.args ?? this.args,
    taskStatus: TaskStatus | undefined = this._taskStatus,
  ): Promise<void> {
    const { reject, queueName = 'default', taskName: methodName, method } = task;
    const { _namespace: namespace } = this;
    const priority = Object.entries(this._queues).find(([_, options]) => (options as any).queueName === queueName);
    const priorityName = priority ? priority[0] : undefined;

    debug(`Running ${namespace}#${methodName}`);
    this.emit(`method:${methodName}`);
    const taskCancelled = task.cancellable && taskStatus?.cancelled;
    if (taskCancelled) {
      return;
    }

    args = typeof args === 'function' ? args(this as any) : args;
    this.runningState = { namespace, queueName, methodName };
    try {
      await method.apply(this, args);
      delete this.runningState;
      const eventName = `done$${namespace || 'unknownnamespace'}#${methodName}`;
      debug(`Done event ${eventName}`);
      this.env.emit(eventName, {
        namespace,
        generator: this,
        queueName,
        priorityName,
      });
    } catch (error: unknown) {
      const errorMessage = `An error occured while running ${namespace}#${methodName}`;
      if (this.log?.error) {
        this.log.error(errorMessage);
      } else {
        debug(errorMessage);
      }

      if (reject) {
        debug('Rejecting task promise, queue will continue normally');
        reject(error);
        return;
      }

      try {
        this.env.emit('error', error);
      } catch (error: unknown) {
        setImmediate(() => {
          throw error;
        });
      }
    } finally {
      delete this.runningState;
    }
  }

  /**
   * Ignore cancellable tasks.
   */
  cancelCancellableTasks(this: BaseGenerator): void {
    this._running = false;
    // Task status references is registered at each running task
    if (this._taskStatus) {
      this._taskStatus.cancelled = true;
    }

    // Create a new task status.
    delete this._taskStatus;
  }

  /**
   * Queue generator tasks.
   */
  async queueTasks(this: BaseGenerator): Promise<void> {
    const thisAny = this as any;

    const beforeQueueCallback: () => Promise<any> =
      (this.features.taskPrefix && thisAny.beforeQueue) ?? thisAny._beforeQueue;
    if (beforeQueueCallback) {
      await beforeQueueCallback.call(this);
    }

    await this._queueTasks();
  }

  async _queueTasks(this: BaseGenerator): Promise<void> {
    debug(`Queueing generator ${this._namespace} with generator version ${this.yoGeneratorVersion}`);
    this.queueOwnTasks({ auto: true });

    for (const generator of this._composedWith) {
      await this.env.queueGenerator(generator, false);
    }

    this._composedWith = [];
  }

  /**
   * Start the generator again.
   */
  startOver(this: BaseGenerator, options?: BaseOptions): void {
    this.cancelCancellableTasks();
    if (options) {
      Object.assign(this.options, options);
    }

    this.queueOwnTasks({ auto: true });
  }

  /**
   * Compose this generator with another one.
   * @param generator  The path to the generator module or an object (see examples)
   * @param args       Arguments passed to the Generator
   * @param options   The options passed to the Generator
   * @param immediately Boolean whether to queue the Generator immediately
   * @return The composed generator
   *
   * @example <caption>Using a peerDependency generator</caption>
   * await this.composeWith('bootstrap', { sass: true });
   *
   * @example <caption>Using a direct dependency generator</caption>
   * await this.composeWith(path.resolve(__dirname, 'generator-bootstrap/app/main.js'), { sass: true });
   *
   * @example <caption>Passing a Generator class</caption>
   * await this.composeWith({ Generator: MyGenerator, path: '../generator-bootstrap/app/main.js' }, { sass: true });
   */
  async composeWith(
    generator: string | string[] | { Generator: any; path: string },
    immediately?: boolean,
  ): Promise<Generator | Generator[]>;
  async composeWith(
    generator: string | string[] | { Generator: any; path: string },
    options: Partial<BaseOptions>,
    immediately?: boolean,
  ): Promise<Generator | Generator[]>;
  async composeWith(
    generator: string | string[] | { Generator: any; path: string },
    args?: string[],
    options?: Partial<BaseOptions>,
    immediately?: boolean,
  ): Promise<Generator | Generator[]>;
  // eslint-disable-next-line max-params
  async composeWith(
    this: BaseGenerator,
    generator: string | string[] | { Generator: any; path: string },
    args?: string[] | (Partial<BaseOptions> & { arguments?: string[]; args?: string[] }) | boolean,
    options?: Partial<BaseOptions> | boolean,
    immediately = false,
  ): Promise<Generator | Generator[]> {
    if (Array.isArray(generator)) {
      const generators: Generator[] = [];
      for (const each of generator) {
        generators.push((await this.composeWith(each, args as any, options as any)) as Generator);
      }

      return generators;
    }

    let parsedArgs: string[] = [];
    let parsedOptions: Partial<BaseOptions> = {};
    if (typeof args === 'boolean') {
      immediately = args;
    } else if (Array.isArray(args)) {
      parsedArgs = args;
      if (typeof options === 'object') {
        parsedOptions = options;
      } else if (typeof options === 'boolean') {
        immediately = options;
      }
    } else if (typeof args === 'object') {
      parsedOptions = args;
      parsedArgs = args.arguments ?? args.args ?? [];
      if (typeof options === 'boolean') {
        immediately = options;
      }
    }

    let instantiatedGenerator;

    // Pass down the default options so they're correctly mirrored down the chain.
    parsedOptions = {
      destinationRoot: this._destinationRoot,
      ...parsedOptions,
      skipInstall: this.options.skipInstall,
      skipCache: this.options.skipCache,
      skipLocalCache: this.options.skipLocalCache,
    };
    const resolveGeneratorPath = async (maybePath: string) => {
      // Allows to run a local generator without namespace.
      // Resolve the generator absolute path to current generator;
      const generatorFile = isAbsolute(maybePath) ? maybePath : pathResolve(dirname(this.resolved), maybePath);
      let generatorResolvedFile: string | undefined;
      try {
        const status = await stat(generatorFile);
        if (status.isFile()) {
          generatorResolvedFile = generatorFile;
        }
      } catch {}

      if (!generatorResolvedFile) {
        // Resolve the generator file.
        // Use import.resolve when stable.
        generatorResolvedFile = pathToFileURL(createRequire(import.meta.url).resolve(generatorFile)).href;
      }

      return generatorResolvedFile;
    };

    const instantiate = async (generatorFactory: any, path: string) => {
      generatorFactory.resolved = path;
      generatorFactory.namespace = this.env.namespace(path);

      return this.env.instantiate<Generator>(generatorFactory, parsedArgs, parsedOptions as any);
    };

    if (typeof generator === 'string') {
      try {
        const resolvedGenerator = await resolveGeneratorPath(generator);

        const generatorImport = await import(resolvedGenerator);

        const generatorFactory =
          typeof generatorImport.default === 'function' ? generatorImport.default : generatorImport;
        instantiatedGenerator = await instantiate(generatorFactory, resolvedGenerator);
      } catch {
        // Forward to the environment
        instantiatedGenerator = await this.env.create<Generator>(generator, parsedArgs, parsedOptions);
      }
    } else {
      const { Generator: generatorFactory } = generator;
      let { path: generatorFile } = generator;
      assert(
        generatorFactory,
        `${chalk.red('Missing Generator property')}
When passing an object to Generator${chalk.cyan('#composeWith')} include the generator class to run in the ${chalk.cyan(
          'Generator',
        )} property

await this.composeWith({
  ${chalk.yellow('Generator')}: MyGenerator,
  ...\n
});`,
      );
      assert(
        typeof generatorFile === 'string',
        `${chalk.red('path property is not a string')}
When passing an object to Generator${chalk.cyan(
          '#composeWith',
        )} include the path to the generators files in the ${chalk.cyan('path')} property

await this.composeWith({
  ${chalk.yellow('path')}: '../my-generator',
  ...
});`,
      );
      try {
        generatorFile = await resolveGeneratorPath(generatorFile);
      } catch {}

      instantiatedGenerator = await instantiate(generatorFactory, generatorFile);
    }

    if (!instantiatedGenerator) {
      return instantiatedGenerator;
    }

    if (this._running || immediately) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      this.env.queueGenerator(instantiatedGenerator);
    } else {
      this._composedWith.push(instantiatedGenerator);
    }

    return instantiatedGenerator;
  }

  /**
   * Add a transform stream to the commit stream.
   *
   * Most usually, these transform stream will be Gulp plugins.
   *
   * @param streams An array of Transform stream
   * or a single one.
   * @return This generator
   */
  queueTransformStream(this: BaseGenerator, transformStreams: Transform | Transform[]) {
    assert(transformStreams, 'expected to receive a transform stream as parameter');

    this.queueTask({
      async method(this: BaseGenerator) {
        return this.env.applyTransforms(Array.isArray(transformStreams) ? transformStreams : [transformStreams]);
      },
      taskName: 'transformStream',
      queueName: 'transform',
    });
    return this;
  }
}
