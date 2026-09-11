import type { PathOptions } from '../types.js';

/**
 * Split `PathOptions` from an options object so the remaining options can be forwarded untouched.
 * Objects without a path option (including `fs.Stats` instances) are returned as is, not copied.
 */
export function splitPathOptions<T extends object>(
  options: (T & PathOptions) | undefined,
): [pathOptions: PathOptions, options: T | undefined] {
  if (!options || typeof options !== 'object' || !('allowOutsideRoot' in options)) {
    return [{}, options];
  }

  const { allowOutsideRoot, ...remaining } = options;
  return [{ allowOutsideRoot }, remaining as T];
}
