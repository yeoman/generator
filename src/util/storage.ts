import assert from 'node:assert';
import _ from 'lodash';
import sortKeys from 'sort-keys';
import { type MemFsEditor } from 'mem-fs-editor';
import { type JSONSchema7Type } from 'json-schema';

type StorageValue = Record<string, JSONSchema7Type>;

/**
 * Proxy handler for Storage
 */
const proxyHandler: ProxyHandler<Storage> = {
  get(storage: Storage, property: string | symbol, receiver: any): JSONSchema7Type {
    return storage.get(property);
  },
  set(storage: Storage, property: string | symbol, value: any, receiver: any): boolean {
    if (typeof property === 'string') {
      storage.set(property, value);
      return true;
    }

    return false;
  },
  ownKeys(storage: Storage) {
    return Reflect.ownKeys(storage._store);
  },
  has(storage: Storage, prop: string | symbol) {
    return storage.get(prop) !== undefined;
  },
  getOwnPropertyDescriptor(storage: Storage, key: string | symbol): PropertyDescriptor {
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
  _cachedStore?: StorageValue;

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
  readContent(): StorageValue {
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
  writeContent(fullStore: JSONSchema7Type): string {
    return this.fs.writeJSON(this.path, fullStore, undefined, this.indent);
  }

  /**
   * Return the current store as JSON object
   * @return the store content
   * @private
   */
  get _store(): StorageValue {
    const store = this._cachedStore ?? this.readContent();
    if (!this.disableCache) {
      this._cachedStore = store;
    }

    if (!this.name) {
      return store;
    }

    return ((this.lodashPath ? _.get(store, this.name) : store[this.name]) ?? {}) as StorageValue;
  }

  /**
   * Persist a configuration to disk
   * @param val - current configuration values
   * @private
   */
  _persist(value: StorageValue) {
    if (this.sorted) {
      value = sortKeys(value, { deep: true });
    }

    let fullStore: StorageValue;
    if (this.name) {
      fullStore = this.readContent();
      if (this.lodashPath) {
        _.set(fullStore, this.name, value);
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
  get(key): JSONSchema7Type {
    return this._store[key];
  }

  /**
   * Get a stored value from a lodash path
   * @param path  The path under which the value is stored.
   * @return The stored value. Any JSON valid type could be returned
   */
  getPath(path): JSONSchema7Type {
    return _.get(this._store, path);
  }

  /**
   * Get all the stored values
   * @return key-value object
   */
  getAll(): StorageValue {
    return _.cloneDeep(this._store);
  }

  /**
   * Assign a key to a value and schedule a save.
   * @param key  The key under which the value is stored
   * @param val  Any valid JSON type value (String, Number, Array, Object).
   * @return val  Whatever was passed in as val.
   */
  set(value: JSONSchema7Type);
  set(key: string, value: JSONSchema7Type);
  set(key: string | JSONSchema7Type, value?: JSONSchema7Type) {
    const store = this._store;

    if (value === undefined) {
      value = Object.assign(store, key);
    } else {
      store[key as string] = value;
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
  setPath(path: string, value: JSONSchema7Type) {
    assert(!_.isFunction(value), "Storage value can't be a function");

    const store = this._store;
    _.set(store, path, value);
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
  defaults(defaults: StorageValue): StorageValue {
    assert(_.isObject(defaults), 'Storage `defaults` method only accept objects');
    const store = _.defaults({}, this._store, defaults);
    this._persist(store);
    return this.getAll();
  }

  /**
   * @param defaults  Key-value object to store.
   * @return val  Returns the merged object.
   */
  merge(source: StorageValue) {
    assert(_.isObject(source), 'Storage `merge` method only accept objects');
    const value = _.merge({}, this._store, source);
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
  createProxy(): StorageValue {
    return new Proxy(this, proxyHandler) as unknown as StorageValue;
  }
}

export default Storage;
