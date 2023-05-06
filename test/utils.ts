import { fileURLToPath } from 'node:url';
import Base from '../src/index.js';

const __filename = fileURLToPath(import.meta.url);

export default class BaseTest extends Base {
  constructor(
    options: Omit<Base['options'], 'namespace' | 'resolved'> & Partial<Pick<Base['options'], 'namespace' | 'resolved'>>,
    features?: Base['features'],
  );
  constructor(
    args: string[],
    options?: Omit<Base['options'], 'namespace' | 'resolved'> &
      Partial<Pick<Base['options'], 'namespace' | 'resolved'>>,
    features?: Base['features'],
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
