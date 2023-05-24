import process from 'node:process';
import { type SimpleGit, simpleGit } from 'simple-git';
import { BaseGenerator } from './generator.js';
import type { BaseFeatures, BaseOptions } from './types.js';
import { DESTINATION_ROOT_CHANGE_EVENT } from './constants.js';

export type * from './types.js';
export type * from './util/storage.js';
export { default as Storage } from './util/storage.js';

export default class Generator<
  O extends BaseOptions = BaseOptions,
  F extends BaseFeatures = BaseFeatures,
> extends BaseGenerator<O, F> {
  _simpleGit?: SimpleGit;

  constructor(...args: any[]) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    super(...args);

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    this._queues = {};

    // Add original queues.
    for (const queue of BaseGenerator.queues) {
      this._queues[queue] = { priorityName: queue, queueName: queue };
    }

    // Add custom queues
    if (Array.isArray(this._customPriorities)) {
      this.registerPriorities(this._customPriorities);
    }
  }

  get simpleGit(): SimpleGit {
    if (!this._simpleGit) {
      this._simpleGit = simpleGit({ baseDir: this.destinationPath() }).env({
        ...process.env,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        LANG: 'en',
      });
      this.on(DESTINATION_ROOT_CHANGE_EVENT, () => {
        this._simpleGit = undefined;
      });
    }

    return this._simpleGit;
  }
}
