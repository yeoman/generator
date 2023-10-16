import { fileURLToPath } from 'node:url';
import Base from '../src/index.js';

const _filename = fileURLToPath(import.meta.url);

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
  constructor(...args: any[]) {
    const optIndex = Array.isArray(args[0]) ? 1 : 0;
    args[optIndex] = args[optIndex] ?? {};
    args[optIndex].resolved = args[optIndex].resolved ?? _filename;
    args[optIndex].namespace = args[optIndex].namespace ?? 'yeoman:testnamespace';
    super(...args);
  }
}
