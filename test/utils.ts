import { fileURLToPath } from 'node:url';
import YeomanEnvironment from 'yeoman-environment';
import type Environment from '../src/environment.js';
import { type ConstructorOptions, type BaseFeatures, type GeneratorDefinition } from '../src/types.js';
import Base from '../src/index.js';

const __filename = fileURLToPath(import.meta.url);

export function createEnv(args?, options?, adapter?): Environment {
  return YeomanEnvironment.createEnv(args, options, adapter) as unknown as Environment;
}

export default class BaseTest<
  GeneratorTypes extends GeneratorDefinition = GeneratorDefinition,
> extends Base<GeneratorTypes> {
  constructor(
    options: Omit<ConstructorOptions, 'namespace' | 'resolved'> &
      Partial<Pick<ConstructorOptions, 'namespace' | 'resolved'>> &
      GeneratorTypes['options'],
    features?: BaseFeatures & GeneratorTypes['features'],
  );
  constructor(
    args: string[],
    options?: Omit<ConstructorOptions, 'namespace' | 'resolved'> &
      Partial<Pick<ConstructorOptions, 'namespace' | 'resolved'>> &
      GeneratorTypes['options'],
    features?: BaseFeatures & GeneratorTypes['features'],
  );
  constructor(args: any, options: any, features?: any) {
    args = Array.isArray(args)
      ? args
      : { ...args, resolved: args?.resolved ?? __filename, namespace: args?.namespace ?? 'yeoman:testnamespace' };
    options = Array.isArray(args)
      ? {
          ...options,
          resolved: options?.resolved ?? __filename,
          namespace: options?.namespace ?? 'yeoman:testnamespace',
        }
      : options;
    super(args, options, features);
  }
}
