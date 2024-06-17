import type {
  BaseGenerator,
  ComposeOptions as EnvironmentComposeOptions,
  GeneratorFeatures as FeaturesApi,
  GeneratorOptions as OptionsApi,
  ProgressOptions,
} from '@yeoman/types';
import type { JSONSchema7Type } from 'json-schema';
import type { PipelineOptions } from 'mem-fs';
import type { MemFsEditorFile } from 'mem-fs-editor';
import type Storage from './util/storage.js';
import type Generator from './index.js';

export type StorageValue = JSONSchema7Type;
export type StorageRecord = Record<string, StorageValue>;
export type GeneratorPipelineOptions = PipelineOptions<MemFsEditorFile> & ProgressOptions & { pendingFiles?: boolean };

/**
 * Queue options.
 */
type QueueOptions = {
  /** Name of the queue. */
  queueName?: string;

  /** Execute only once by namespace and taskName. */
  once?: boolean;

  /** Run the queue if not running yet. */
  run?: boolean;

  /** Edit a priority */
  edit?: boolean;

  /** Queued manually only */
  skip?: boolean;

  /** Arguments to pass to tasks */
  args?: any[] | ((generator: Generator) => any[]);
};

/**
 * Task options.
 */
export type TaskOptions = QueueOptions & {
  /** Reject callback. */
  reject?: (error: unknown) => void;

  taskPrefix?: string;

  auto?: boolean;

  taskOrigin?: any;

  cancellable?: boolean;
};

/**
 * Priority object.
 */
export type Priority = QueueOptions & {
  /** Name of the priority. */
  priorityName: string;
  /** The queue which this priority should be added before. */
  before?: string;
};

/**
 * Complete Task object.
 */
export type Task<TaskContext = any> = TaskOptions & {
  /** Function to be queued. */

  method: (this: TaskContext, ...args: any[]) => unknown | Promise<unknown>;

  /** Name of the task. */
  taskName: string;
};

export type BaseFeatures = FeaturesApi & {
  /** The Generator instance unique identifier. The Environment will ignore duplicated identifiers. */
  uniqueBy?: string;

  /** UniqueBy calculation method */
  unique?: true | 'argument' | 'namespace';

  /** Only queue methods that matches a priority. */
  tasksMatchingPriority?: boolean;

  /** Tasks methods starts with prefix. Allows api methods (non tasks) without prefix. */
  taskPrefix?: string;

  /** Provides a custom install task. Environment built-in task will not be executed */
  customInstallTask?: boolean | ((...args: any[]) => void | Promise<void>);

  /** Provides a custom commit task. */
  customCommitTask?: boolean | ((...args: any[]) => void | Promise<void>);

  /** Disable args/options parsing. Whenever options/arguments are provided parsed like using commander based parsing. */
  skipParseOptions?: boolean;

  /** Custom priorities for more fine tuned workflows. */
  customPriorities?: Priority[];

  /** Inherit tasks from parent prototypes, implies tasksMatchingPriority */
  inheritTasks?: boolean;
};

export type BaseOptions = OptionsApi & {
  destinationRoot?: string;

  skipInstall?: boolean;

  skipCheckEnv?: boolean;

  ignoreVersionCheck?: boolean;

  askAnswered?: boolean;

  localConfigOnly?: boolean;

  skipCache?: boolean;

  skipLocalCache?: boolean;

  description?: string;

  /** @deprecated moved to features */
  skipParseOptions?: boolean;

  /** @deprecated moved to features */
  customPriorities?: Priority[];
};

export type ArgumentSpec = {
  name: string;

  /** Description for the argument. */
  description?: string;

  /** A value indicating whether the argument is required. */
  required?: boolean;

  /** A value indicating whether the argument is optional. */
  optional?: boolean;

  /** The type of the argument. */
  type: typeof String | typeof Number | typeof Array | typeof Object;

  /** The default value of the argument. */
  default?: any;
};

export type CliOptionSpec = {
  name: string;

  /** The type of the option. */
  type: typeof Boolean | typeof String | typeof Number | ((opt: string) => any);

  required?: boolean;

  /** The option name alias (example `-h` and --help`). */
  alias?: string;

  /** The default value. */
  default?: any;

  /** The description for the option. */
  description?: string;

  /** A value indicating whether the option should be hidden from the help output. */
  hide?: boolean;

  /** The storage to persist the option */
  storage?: string | Storage;
};

export type ComposeOptions<G extends BaseGenerator = BaseGenerator> = EnvironmentComposeOptions<G> & {
  destinationRoot?: string;
  skipEnvRegister?: boolean;
  forceResolve?: boolean;
  forwardOptions?: boolean;
};
