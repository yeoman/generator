/* eslint-disable @typescript-eslint/member-ordering */
import { dirname, isAbsolute, resolve as pathResolve, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { Duplex } from 'node:stream';
import { stat } from 'node:fs/promises';
import createDebug from 'debug';
import type { BaseGenerator, GetGeneratorOptions, ComposeOptions as EnvironmentComposeOptions } from '@yeoman/types';
import { toNamespace } from '@yeoman/namespace';
import { type FileTransform, isFileTransform } from 'mem-fs';
import { type MemFsEditorFile } from 'mem-fs-editor';
// eslint-disable-next-line n/file-extension-in-import
import { isFilePending } from 'mem-fs-editor/state';
import type { Task, TaskOptions, BaseOptions, Priority, ComposeOptions, GeneratorPipelineOptions } from '../types.js';
import type Generator from '../index.js';
import type BaseGeneratorImpl from '../generator.js';

const debug = createDebug('yeoman:generator');

type TaskStatus = {
  cancelled: boolean;
  timestamp: Date;
};

// Ensure a prototype method is a candidate run by default
const methodIsValid = function (name: string) {
  return !name.startsWith('_') && name !== 'constructor';
};

export abstract class TasksMixin {
  // Queues map: generator's queue name => grouped-queue's queue name (custom name)
  readonly _queues!: Record<string, Priority>;

  customLifecycle?: boolean;
  runningState?: { namespace: string; queueName: string; methodName: string };
  _taskStatus?: TaskStatus;

  /**
   * Register priorities for this generator
   */
  registerPriorities(this: BaseGeneratorImpl, priorities: Priority[]) {
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
  queueMethod(
    this: BaseGeneratorImpl,
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
  queueTaskGroup(this: BaseGeneratorImpl, taskGroup: Record<string, Task['method']>, taskOptions: TaskOptions): void {
    for (const task of this.extractTasksFromGroup(taskGroup, taskOptions)) {
      this.queueTask(task);
    }
  }

  /**
   * Extract tasks from a priority.
   *
   * @param name: The method name to schedule.
   */
  extractTasksFromPriority(this: BaseGeneratorImpl, name: string, taskOptions: TaskOptions = {}): Task[] {
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
  extractTasksFromGroup(
    this: BaseGeneratorImpl,
    group: Record<string, Task['method']>,
    taskOptions: TaskOptions,
  ): Task[] {
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
  queueOwnTask(this: BaseGeneratorImpl, name: string, taskOptions: TaskOptions): void {
    for (const task of this.extractTasksFromPriority(name, taskOptions)) this.queueTask(task);
  }

  /**
   * Get task names.
   */
  getTaskNames(this: BaseGeneratorImpl): string[] {
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(this));
    let validMethods = methods.filter(method => methodIsValid(method));
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
  queueOwnTasks(this: BaseGeneratorImpl, taskOptions: TaskOptions): void {
    this._running = true;
    this._taskStatus = { cancelled: false, timestamp: new Date() };

    const validMethods = this.getTaskNames();
    if (validMethods.length === 0 && this._prompts.length === 0 && !this.customLifecycle) {
      throw new Error('This Generator is empty. Add at least one method for it to run.');
    }

    if (this._prompts.length > 0) {
      this.queueTask({
        method: async () => (this as any).prompt(this._prompts, this.config),
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
  queueTask(this: BaseGeneratorImpl, task: Task<this>): void {
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
    this: BaseGeneratorImpl,
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

      throw error;
    } finally {
      delete this.runningState;
    }
  }

  /**
   * Ignore cancellable tasks.
   */
  cancelCancellableTasks(this: BaseGeneratorImpl): void {
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
  async queueTasks(this: BaseGeneratorImpl): Promise<void> {
    const thisAny = this as any;
    const thisPrototype = Object.getPrototypeOf(thisAny);

    let beforeQueueCallback: (() => Promise<any>) | undefined;
    if (this.features.taskPrefix) {
      // We want beforeQueue if beforeQueue belongs to the object or to the imediatelly extended class.
      beforeQueueCallback =
        Object.hasOwn(thisAny, 'beforeQueue') || Object.hasOwn(thisPrototype, 'beforeQueue')
          ? thisAny.beforeQueue
          : undefined;
    }

    if (!beforeQueueCallback) {
      // Fallback to _beforeQueue,
      beforeQueueCallback =
        Object.hasOwn(thisAny, '_beforeQueue') || Object.hasOwn(thisPrototype, '_beforeQueue')
          ? thisAny._beforeQueue
          : undefined;
    }

    if (beforeQueueCallback) {
      await beforeQueueCallback.call(this);
    }

    await this._queueTasks();
  }

  async _queueTasks(this: BaseGeneratorImpl): Promise<void> {
    debug(`Queueing generator ${this._namespace} with generator version ${this.yoGeneratorVersion}`);
    this.queueOwnTasks({ auto: true });
  }

  /**
   * Start the generator again.
   */
  startOver(this: BaseGeneratorImpl, options?: BaseOptions): void {
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
   * await this.composeWith(path.resolve(_dirname, 'generator-bootstrap/app/main.js'), { sass: true });
   *
   * @example <caption>Passing a Generator class</caption>
   * await this.composeWith({ Generator: MyGenerator, path: '../generator-bootstrap/app/main.js' }, { sass: true });
   */
  async composeWith<G extends BaseGenerator = BaseGenerator>(
    generator: string | { Generator: any; path: string },
    immediately?: boolean,
  ): Promise<G>;
  async composeWith<G extends BaseGenerator = BaseGenerator>(generator: string[], immediately?: boolean): Promise<G[]>;
  async composeWith<G extends BaseGenerator = BaseGenerator>(
    generator: string | { Generator: any; path: string },
    options: Partial<GetGeneratorOptions<G>>,
    immediately?: boolean,
  ): Promise<G>;
  async composeWith<G extends BaseGenerator = BaseGenerator>(
    generator: string[],
    options: Partial<GetGeneratorOptions<G>>,
    immediately?: boolean,
  ): Promise<G[]>;
  async composeWith<G extends BaseGenerator = BaseGenerator>(
    generator: string | { Generator: any; path: string },
    args: string[],
    options?: Partial<GetGeneratorOptions<G>>,
    immediately?: boolean,
  ): Promise<G>;
  async composeWith<G extends BaseGenerator = BaseGenerator>(
    generator: string[],
    args: string[],
    options?: Partial<GetGeneratorOptions<G>>,
    immediately?: boolean,
  ): Promise<G[]>;
  async composeWith<G extends BaseGenerator = BaseGenerator>(
    generator: string,
    options?: ComposeOptions<G>,
  ): Promise<G[]>;
  // eslint-disable-next-line max-params
  async composeWith<G extends BaseGenerator = BaseGenerator>(
    this: BaseGeneratorImpl,
    generator: string | string[] | { Generator: any; path: string },
    args?:
      | string[]
      | (Partial<GetGeneratorOptions<G>> | { arguments?: string[]; args?: string[] })
      | boolean
      | ComposeOptions<G>,
    options?: Partial<GetGeneratorOptions<G>> | boolean,
    immediately = false,
  ): Promise<G | G[]> {
    if (Array.isArray(generator)) {
      const generators: Generator[] = [];
      for (const each of generator) {
        generators.push(await this.composeWith(each, args as any, options as any));
      }

      return generators as any;
    }

    if (
      typeof args === 'object' &&
      ('generatorArgs' in args ||
        'generatorOptions' in args ||
        'skipEnvRegister' in args ||
        'forceResolve' in args ||
        'forwardOptions' in args)
    ) {
      return this.composeWithOptions(generator, args);
    }

    let parsedArgs: string[] = [];
    let parsedOptions: Partial<BaseOptions> = {};
    if (typeof args === 'boolean') {
      return this.composeWithOptions<G>(generator, { schedule: !args });
    }

    if (Array.isArray(args)) {
      if (typeof options === 'object') {
        return this.composeWithOptions<G>(generator, {
          generatorArgs: args,
          generatorOptions: options,
          schedule: !immediately,
        });
      }

      if (typeof options === 'boolean') {
        return this.composeWithOptions<G>(generator, { generatorArgs: args, schedule: !options });
      }

      return this.composeWithOptions<G>(generator, { generatorArgs: args });
    }

    if (typeof args === 'object') {
      parsedOptions = args as any;
      parsedArgs = (args as any).arguments ?? (args as any).args ?? [];
      if (typeof options === 'boolean') {
        immediately = options;
      }

      return this.composeWithOptions<G>(generator, {
        generatorArgs: parsedArgs,
        generatorOptions: parsedOptions as any,
        schedule: !immediately,
      });
    }

    return this.composeWithOptions<G>(generator);
  }

  private async composeWithOptions<G extends BaseGenerator = BaseGenerator>(
    this: BaseGeneratorImpl,
    generator: string | { Generator: any; path: string },
    options: ComposeOptions<G> = {},
  ): Promise<G | G[]> {
    const { forceResolve, skipEnvRegister = false, forwardOptions, ...composeOptions } = options;
    const optionsToForward = forwardOptions
      ? this.options
      : {
          skipInstall: this.options.skipInstall,
          skipCache: this.options.skipCache,
          skipLocalCache: this.options.skipLocalCache,
        };

    composeOptions.generatorOptions = {
      destinationRoot: this._destinationRoot,
      ...optionsToForward,
      ...composeOptions.generatorOptions,
    } as any;

    if (typeof generator === 'object') {
      let generatorFile;
      try {
        generatorFile = await this.resolveGeneratorPath(generator.path ?? generator.Generator.resolved);
      } catch {}

      const resolved = generatorFile ?? generator.path ?? generator.Generator.resolved;
      // eslint-disable-next-line @typescript-eslint/naming-convention
      return this.composeLocallyWithOptions<G>({ Generator: generator.Generator, resolved }, composeOptions);
    }

    if (skipEnvRegister || isAbsolute(generator) || generator.startsWith('.')) {
      const resolved = await this.resolveGeneratorPath(generator);
      return this.composeLocallyWithOptions<G>({ resolved }, composeOptions);
    }

    const namespace = typeof generator === 'string' ? toNamespace(generator) : undefined;
    if (!namespace || forceResolve) {
      try {
        generator = await this.resolveGeneratorPath(generator);
      } catch {}
    }

    return this.env.composeWith<G>(generator, composeOptions);
  }

  private async composeLocallyWithOptions<G extends BaseGenerator = BaseGenerator>(
    this: BaseGeneratorImpl,
    { Generator, resolved = Generator.resolved }: { Generator?: any; resolved: string },
    options: EnvironmentComposeOptions<G> = {},
  ) {
    const generatorNamespace = this.env.namespace(resolved);
    const findGenerator = async () => {
      const generatorImport = await import(resolved);
      const getFactory = (module: any) =>
        module.createGenerator ?? module.default?.createGenerator ?? module.default?.default?.createGenerator;
      const factory = getFactory(generatorImport);
      if (factory) {
        return factory(this.env);
      }

      return typeof generatorImport.default === 'function' ? generatorImport.default : generatorImport;
    };

    Generator = Generator ?? (await findGenerator());
    Generator.namespace = generatorNamespace;
    Generator.resolved = resolved;
    return this.env.composeWith<G>(Generator, options);
  }

  private async resolveGeneratorPath(this: BaseGeneratorImpl, maybePath: string) {
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
  }

  async pipeline(
    this: BaseGeneratorImpl,
    options?: GeneratorPipelineOptions,
    ...transforms: Array<FileTransform<MemFsEditorFile>>
  ) {
    if (isFileTransform(options)) {
      transforms = [options, ...transforms];
      options = {};
    }

    let filter: ((file: MemFsEditorFile) => boolean) | undefined;
    const { disabled, name, pendingFiles = true, filter: passedFilter, ...memFsPipelineOptions } = options ?? {};
    if (passedFilter && pendingFiles) {
      filter = (file: MemFsEditorFile) => isFilePending(file) && passedFilter(file);
    } else {
      filter = pendingFiles ? isFilePending : passedFilter;
    }

    const { env } = this;
    await env.adapter.progress(
      async ({ step }) =>
        env.sharedFs.pipeline(
          { filter, ...memFsPipelineOptions },
          ...transforms,
          Duplex.from(async function* (generator: AsyncGenerator<MemFsEditorFile>) {
            for await (const file of generator) {
              step('Completed', relative(env.logCwd, file.path));
              yield file;
            }
          }),
        ),
      { disabled, name },
    );
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
  queueTransformStream(
    this: BaseGeneratorImpl,
    options?: GeneratorPipelineOptions & { priorityToQueue?: string },
    ...transforms: Array<FileTransform<MemFsEditorFile>>
  ) {
    if (isFileTransform(options)) {
      transforms = [options, ...transforms];
      options = {};
    }

    const { priorityToQueue, ...pipelineOptions } = options!;
    const getQueueForPriority = (priority: string): string => {
      const found = this._queues[priority];
      if (!found) {
        throw new Error(`Could not find priority '${priority}'`);
      }

      return found.queueName ?? found.priorityName;
    };

    const queueName = priorityToQueue ? getQueueForPriority(priorityToQueue) : 'transform';

    this.queueTask({
      method: async () => this.pipeline(pipelineOptions, ...transforms),
      taskName: 'transformStream',
      queueName,
    });

    return this;
  }
}
