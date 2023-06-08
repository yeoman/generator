import assert from 'node:assert';
import { cloneDeep, defaults as setDefaults, merge, get, set } from 'lodash-es';
import sortKeys from 'sort-keys';
import type { MemFsEditor } from 'mem-fs-editor';
import type { StorageRecord, StorageValue } from '../types.js';

/**
 * Proxy handler for Storage
 */
const proxyHandler: ProxyHandler<Storage> = {
  get(storage: Storage, property: string, receiver: any): StorageValue {
    return storage.get(property);
  },
  set(storage: Storage, property: string, value: any, receiver: any): boolean {
    if (typeof property === 'string') {
      storage.set(property, value);
      return true;
    }

    return false;
  },
  ownKeys(storage: Storage) {
    return Reflect.ownKeys(storage._store);
  },
  has(storage: Storage, prop: string) {
    return storage.get(prop) !== undefined;
  },
  getOwnPropertyDescriptor(storage: Storage, key: string): PropertyDescriptor {
    return {
      get: () => this.get!(storage, key, null),
      enumerable: true,
      configurable: true,
    };
  },
};

export type StorageOptions = {
  name?: string;
  /**
   * Set true to treat name as a lodash path.
   */
  lodashPath?: boolean;
  /**
   * Set true to disable json object cache.
   */
  disableCache?: boolean;
  /**
   * Set true to cleanup cache for every fs change.
   */
  disableCacheByFile?: boolean;
  /**
   * Set true to write sorted json.
   */
  sorted?: boolean;
};

/**
 * Storage instances handle a json file where Generator authors can store data.
 *
 * The `Generator` class instantiate the storage named `config` by default.
 *
 * @constructor
 * @param name     The name of the new storage (this is a namespace)
 * @param fs  A mem-fs editor instance
 * @param configPath The filepath used as a storage.
 *
 * @example
 * class extend Generator {
 *   writing: function() {
 *     this.config.set('coffeescript', false);
 *   }
 * }
 */
class Storage {
  path: string;
  name?: string;
  fs: MemFsEditor;
  indent: number;
  lodashPath: boolean;
  disableCache: boolean;
  disableCacheByFile: boolean;
  sorted: boolean;
  existed: boolean;
  _cachedStore?: StorageRecord;

  constructor(name: string | undefined, fs: MemFsEditor, configPath: string, options?: StorageOptions);
  constructor(fs: MemFsEditor, configPath: string, options?: StorageOptions);
  constructor(
    name: string | MemFsEditor | undefined,
    fs: MemFsEditor | string,
    configPath?: string | StorageOptions,
    options: StorageOptions = {},
  ) {
    let editor: MemFsEditor | undefined;
    let actualName: string | undefined;
    let actualConfigPath: string | undefined;
    let actualOptions: StorageOptions = options;

    if (typeof name === 'string') {
      actualName = name;
    } else if (typeof name === 'object') {
      editor = name;
    }

    if (typeof fs === 'string') {
      actualConfigPath = fs;
    } else {
      editor = fs;
    }

    if (typeof configPath === 'string') {
      actualConfigPath = configPath;
    } else if (typeof configPath === 'object') {
      actualOptions = configPath;
    }

    if (!editor) {
      throw new Error(`Check parameters`);
    }

    assert(actualConfigPath, 'A config filepath is required to create a storage');

    this.path = actualConfigPath;
    this.name = actualName ?? actualOptions.name;
    this.fs = editor;
    this.indent = 2;
    this.lodashPath = actualOptions.lodashPath ?? false;
    this.disableCache = actualOptions.disableCache ?? false;
    this.disableCacheByFile = actualOptions.disableCacheByFile ?? false;
    this.sorted = actualOptions.sorted ?? false;

    this.existed = Object.keys(this._store).length > 0;

    this.fs.store.on('change', filename => {
      // At mem-fs 1.1.3 filename is not passed to the event.
      if (this.disableCacheByFile || (filename && filename !== this.path)) {
        return;
      }

      delete this._cachedStore;
    });
  }

  /**
   * @protected
   * @return the store content
   */
  readContent(): StorageRecord {
    const content = this.fs.readJSON(this.path, {});
    if (!content || typeof content !== 'object' || Array.isArray(content)) {
      throw new Error(`${this.path} is not a valid Storage`);
    }

    return content;
  }

  /**
   * @protected
   * @return the store content
   */
  writeContent(fullStore: StorageValue): string {
    return this.fs.writeJSON(this.path, fullStore, undefined, this.indent);
  }

  /**
   * Return the current store as JSON object
   * @return the store content
   * @private
   */
  get _store(): StorageRecord {
    const store = this._cachedStore ?? this.readContent();
    if (!this.disableCache) {
      this._cachedStore = store;
    }

    if (!this.name) {
      return store;
    }

    return ((this.lodashPath ? get(store, this.name) : store[this.name]) ?? {}) as StorageRecord;
  }

  /**
   * Persist a configuration to disk
   * @param val - current configuration values
   * @private
   */
  _persist(value: StorageRecord) {
    if (this.sorted) {
      value = sortKeys(value, { deep: true });
    }

    let fullStore: StorageRecord;
    if (this.name) {
      fullStore = this.readContent();
      if (this.lodashPath) {
        set(fullStore, this.name, value);
      } else {
        fullStore[this.name] = value;
      }
    } else {
      fullStore = value;
    }

    this.writeContent(fullStore);
  }

  /**
   * Save a new object of values
   */
  save(): void {
    this._persist(this._store);
  }

  /**
   * Get a stored value
   * @param key  The key under which the value is stored.
   * @return The stored value. Any JSON valid type could be returned
   */
  get<T extends StorageValue = StorageValue>(key: string): T {
    return this._store[key] as T;
  }

  /**
   * Get a stored value from a lodash path
   * @param path  The path under which the value is stored.
   * @return The stored value. Any JSON valid type could be returned
   */
  getPath<T extends StorageValue = StorageValue>(path: string): T {
    return get(this._store, path) as T;
  }

  /**
   * Get all the stored values
   * @return key-value object
   */
  getAll(): StorageRecord {
    return cloneDeep(this._store);
  }

  /**
   * Assign a key to a value and schedule a save.
   * @param key  The key under which the value is stored
   * @param val  Any valid JSON type value (String, Number, Array, Object).
   * @return val  Whatever was passed in as val.
   */
  set<V = StorageValue>(value: V): V;
  set<V = StorageValue>(key: string | number, value?: V): V | undefined;
  set<V = StorageValue>(key: string | number | V, value?: V): V | undefined {
    const store = this._store;

    if (typeof key === 'object') {
      value = Object.assign(store, key);
    } else if (typeof key === 'string' || typeof key === 'number') {
      store[key] = value as any;
    } else {
      throw new TypeError(`key not supported ${typeof key}`);
    }

    this._persist(store);
    return value;
  }

  /**
   * Assign a lodash path to a value and schedule a save.
   * @param path  The key under which the value is stored
   * @param val  Any valid JSON type value (String, Number, Array, Object).
   * @return val  Whatever was passed in as val.
   */
  setPath(path: string | number, value: StorageValue) {
    assert(typeof value !== 'function', "Storage value can't be a function");

    const store = this._store;
    set(store, path, value);
    this._persist(store);
    return value;
  }

  /**
   * Delete a key from the store and schedule a save.
   * @param key  The key under which the value is stored.
   */
  delete(key: string) {
    const store = this._store;
    // eslint-disable-next-line  @typescript-eslint/no-dynamic-delete
    delete store[key];
    this._persist(store);
  }

  /**
   * Setup the store with defaults value and schedule a save.
   * If keys already exist, the initial value is kept.
   * @param defaults  Key-value object to store.
   * @return val  Returns the merged options.
   */
  defaults(defaults: StorageRecord): StorageRecord {
    assert(typeof defaults === 'object', 'Storage `defaults` method only accept objects');
    const store = setDefaults({}, this._store, defaults);
    this._persist(store);
    return this.getAll();
  }

  /**
   * @param defaults  Key-value object to store.
   * @return val  Returns the merged object.
   */
  merge(source: StorageRecord) {
    assert(typeof source === 'object', 'Storage `merge` method only accept objects');
    const value = merge({}, this._store, source);
    this._persist(value);
    return this.getAll();
  }

  /**
   * Create a child storage.
   * @param path - relative path of the key to create a new storage.
   *                         Some paths need to be escaped. Eg: ["dotted.path"]
   * @return Returns a new Storage.
   */
  createStorage(path: string): Storage {
    const childName = this.name ? `${this.name}.${path}` : path;
    return new Storage(childName, this.fs, this.path, { lodashPath: true });
  }

  /**
   * Creates a proxy object.
   * @return proxy.
   */
  createProxy(): StorageRecord {
    return new Proxy(this, proxyHandler) as unknown as StorageRecord;
  }
}

export default Storage;
