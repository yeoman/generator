import { fileURLToPath } from 'node:url';
import Base, { type BaseFeatures, type BaseOptions } from '../src/index.js';

const _filename = fileURLToPath(import.meta.url);

export type TestGeneratorOptions = Omit<BaseOptions, 'namespace' | 'resolved' | 'help'> &
  Partial<Pick<BaseOptions, 'namespace' | 'resolved' | 'help'>>;

export default class BaseTest<O extends BaseOptions = BaseOptions, F extends BaseFeatures = BaseFeatures> extends Base<
  Record<any, any>,
  O,
  F
> {
  constructor(options: TestGeneratorOptions, features?: BaseFeatures);
  constructor(args?: string[], options?: TestGeneratorOptions, features?: BaseFeatures);
  constructor(...args: any[]) {
    const optIndex = Array.isArray(args[0]) ? 1 : 0;
    args[optIndex] = args[optIndex] ?? {};
    args[optIndex].resolved = args[optIndex].resolved ?? _filename;
    args[optIndex].namespace = args[optIndex].namespace ?? 'yeoman:testnamespace';
    super(...args);
  }
}

export const instantiateGenerator = <O extends Record<any, any>>(options: O) =>
  new BaseTest<O & BaseOptions, BaseFeatures>([], options);
