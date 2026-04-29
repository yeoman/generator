import process from 'node:process';
import { CheckRepoActions, CleanOptions, type SimpleGit, type SimpleGitOptions, simpleGit } from 'simple-git';
import { BaseGenerator } from './generator.js';
import type { BaseFeatures, BaseOptions } from './types.js';

export type * from './types.js';
export type * from './questions.js';
export type * from './util/storage.js';
export { default as Storage } from './util/storage.js';

type SimpleGitWithConstants = SimpleGit & {
  CheckRepoActions: typeof CheckRepoActions;
  CleanOptions: typeof CleanOptions;
};

export default class Generator<
  C extends Record<any, any> = Record<any, any>,
  O extends BaseOptions = BaseOptions,
  F extends BaseFeatures = BaseFeatures,
> extends BaseGenerator<C, O, F> {
  constructor(arguments_?: string[], options?: BaseOptions, features?: BaseFeatures) {
    super(arguments_, options, features);

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    this._queues = {};

    // Add original queues.
    for (const queue of BaseGenerator.queues) {
      this._queues[queue] = { priorityName: queue, queueName: queue };
    }

    // Add custom queues
    if (Array.isArray(this.features.customPriorities)) {
      this.registerPriorities(this.features.customPriorities);
    }
  }

  get simpleGit(): SimpleGitWithConstants {
    return this.createSimpleGit();
  }

  createSimpleGit(options?: Partial<SimpleGitOptions>): SimpleGitWithConstants {
    const git = simpleGit({ baseDir: this.destinationPath(), ...options }).env({
      HOME: process.env.HOME,
      PATH: process.env.PATH,
      LANG: 'C',
      LC_ALL: 'C',
    }) as SimpleGitWithConstants;
    git.CheckRepoActions = CheckRepoActions;
    git.CleanOptions = CleanOptions;
    return git;
  }
}
