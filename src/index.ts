import { BaseGenerator } from './generator.js';
import type { BaseFeatures, BaseOptions } from './types.js';

export default class Generator<
  O extends BaseOptions = BaseOptions,
  F extends BaseFeatures = BaseFeatures,
> extends BaseGenerator {
  constructor(...args: any[]) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    super(...args);

    this._composedWith = [];
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
}
