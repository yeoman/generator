/**
 * Object helpers of the storage, with the behavior of the lodash functions of the same name for the JSON-like data a
 * storage holds: plain objects, arrays and primitives.
 */

const isObjectLike = (value: unknown): value is Record<PropertyKey, any> => typeof value === 'object' && value !== null;

const isPlainObject = (value: unknown): value is Record<PropertyKey, any> => {
  if (!isObjectLike(value) || Object.prototype.toString.call(value) !== '[object Object]') {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === null || prototype === Object.prototype;
};

const isIndex = (key: PropertyKey): boolean =>
  typeof key === 'number' || (typeof key === 'string' && /^(?:0|[1-9]\d*)$/.test(key));

// The keys a path can not go through, as lodash refuses them.
const isUnsafeKey = (key: PropertyKey): boolean => key === '__proto__' || key === 'constructor' || key === 'prototype';

const plainPropertyPattern = /^\w*$/;
const deepPropertyPattern = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/;
const propertyNamePattern =
  /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g;
const escapeCharacterPattern = /\\(\\)?/g;

/**
 * The keys of a path: `a.b[0]["c.d"]` is `['a', 'b', '0', 'c.d']`. A path that is a key of the object, or has no `.`
 * nor `[`, is the key itself.
 */
const toPath = (path: PropertyKey | readonly PropertyKey[], object?: unknown): PropertyKey[] => {
  if (Array.isArray(path)) {
    return [...path];
  }

  if (typeof path !== 'string') {
    return [path as PropertyKey];
  }

  if (plainPropertyPattern.test(path) || !deepPropertyPattern.test(path) || (isObjectLike(object) && path in object)) {
    return [path];
  }

  const keys: string[] = [];
  if (path.startsWith('.')) {
    keys.push('');
  }

  path.replaceAll(propertyNamePattern, (match, number?: string, quote?: string, subString?: string) => {
    keys.push(quote ? subString!.replaceAll(escapeCharacterPattern, '$1') : (number ?? match));
    return match;
  });
  return keys;
};

/**
 * The value at a path of an object, like lodash `get`.
 */
export const get = (object: unknown, path: PropertyKey | readonly PropertyKey[]): any => {
  const keys = toPath(path, object);
  let value: any = object;
  for (const key of keys) {
    if (value === null || value === undefined) {
      return undefined;
    }

    value = value[key];
  }

  return keys.length > 0 ? value : undefined;
};

/**
 * Set the value at a path of an object, creating the missing objects (arrays for an index), like lodash `set`.
 */
export const set = <T>(object: T, path: PropertyKey | readonly PropertyKey[], value: unknown): T => {
  if (!isObjectLike(object)) {
    return object;
  }

  const keys = toPath(path, object);
  let nested: Record<PropertyKey, any> = object;
  for (const [index, key] of keys.entries()) {
    if (isUnsafeKey(key)) {
      return object;
    }

    if (index === keys.length - 1) {
      nested[key] = value;
    } else {
      const current = nested[key];
      if (!isObjectLike(current)) {
        nested[key] = isIndex(keys[index + 1]) ? [] : {};
      }

      nested = nested[key];
    }
  }

  return object;
};

/**
 * Assign to the target the properties of the sources it has as undefined, the first source first, like lodash
 * `defaults`.
 */
export const defaults = <T extends object>(target: T, ...sources: Array<object | undefined>): T => {
  for (const source of sources) {
    if (!source) continue;
    for (const key in source) {
      if ((target as any)[key] === undefined) {
        (target as any)[key] = (source as any)[key];
      }
    }
  }

  return target;
};

/**
 * A deep copy of the arrays and plain objects of a value, the other values kept, like lodash `cloneDeep` for JSON-like
 * data.
 */
export const cloneDeep = <T>(value: T): T => {
  if (Array.isArray(value)) {
    return value.map(item => cloneDeep(item)) as T;
  }

  if (isPlainObject(value)) {
    const copy: Record<PropertyKey, any> = Object.getPrototypeOf(value) === null ? Object.create(null) : {};
    for (const key of Object.keys(value)) {
      copy[key] = cloneDeep(value[key]);
    }

    return copy as T;
  }

  return value;
};

const mergeInto = (target: Record<PropertyKey, any>, source: Record<PropertyKey, any>): void => {
  for (const key in source) {
    if (isUnsafeKey(key)) continue;
    const sourceValue = source[key];
    const targetValue = target[key];
    let value: any;
    if (Array.isArray(sourceValue)) {
      value = Array.isArray(targetValue) ? targetValue : [];
      mergeInto(value, sourceValue);
    } else if (isPlainObject(sourceValue)) {
      value = isObjectLike(targetValue) && typeof targetValue !== 'function' ? targetValue : {};
      mergeInto(value, sourceValue);
    } else {
      value = sourceValue;
    }

    // An undefined source value only adds a missing key.
    if ((value !== undefined && !Object.is(targetValue, value)) || (value === undefined && !(key in target))) {
      target[key] = value;
    }
  }
};

/**
 * Merge the sources into the target, recursively for the plain objects and arrays (by index), like lodash `merge`.
 */
export function merge<T extends object, S>(target: T, source: S): T & S;
export function merge<T extends object, S1, S2>(target: T, source1: S1, source2: S2): T & S1 & S2;
export function merge(target: object, ...sources: unknown[]): any;
export function merge(target: object, ...sources: unknown[]): any {
  for (const source of sources) {
    if (isObjectLike(source)) {
      mergeInto(target as Record<PropertyKey, any>, source);
    }
  }

  return target;
}
