/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import fs from 'node:fs';
import os from 'node:os';
import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { type MemFsEditor, create as createMemFsEditor } from 'mem-fs-editor';
import helpers from 'yeoman-test';
import { type Store, create as createMemFs } from 'mem-fs';
import Storage from '../src/util/storage.js';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const _filename = fileURLToPath(import.meta.url);
const _dirname = dirname(_filename);

const tmpdir: string = path.join(os.tmpdir(), 'yeoman-storage');

function rm(filepath: string) {
  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath);
  }
}

describe('Storage', () => {
  let beforeDir: string;
  let storePath: string;
  let memFsInstance: Store;
  let editor: MemFsEditor;

  beforeEach(async () => {
    await helpers.prepareTemporaryDir();
  });

  beforeEach(() => {
    beforeDir = process.cwd();
    storePath = path.join(tmpdir, 'new-config.json');
    memFsInstance = createMemFs();
    editor = createMemFsEditor(memFsInstance);
  });

  afterEach(() => {
    if (fs.existsSync(storePath)) {
      const json = editor.read(storePath);
      expect(json!.endsWith('\n').toBeTruthy());
      expect(!json!.endsWith('\n\n').toBeTruthy());
      rm(storePath);
      process.chdir(beforeDir);
    }
  });

  describe('.constructor()', () => {
    it('require a parameter', () => {
      expect(() => {
        // @ts-expect-error invalid arguments
        new Storage();
      }).toThrow();
    });

    it('require at least 2 parameter', () => {
      expect(() => {
        // @ts-expect-error invalid arguments
        new Storage({});
      }).toThrow();
    });

    it('take a path parameter', () => {
      const store = new Storage('test', editor, path.join(_dirname, './fixtures/config.json'));
      expect(store.get('testFramework')).toBe('mocha');
      expect(store.existed).toBeTruthy();
    });

    it('take a fs and path parameter without name', () => {
      const store = new Storage(editor, path.join(_dirname, './fixtures/config.json'));
      expect(store.get('test')!.testFramework).toBe('mocha');
      expect(store.existed).toBeTruthy();
    });
  });

  it('a config path is required', () => {
    expect(() => {
      // @ts-expect-error invalid arguments
      new Storage('yo').toThrow(editor);
    });
  });

  describe('#get()', () => {
    let store: Storage;

    beforeEach(() => {
      store = new Storage('test', editor, storePath);
      store.set('foo', 'bar');
    });

    it('namespace each store sharing the same store file', () => {
      const localStore = new Storage('foobar', editor, storePath);
      localStore.set('foo', 'something else');
      expect(store.get('foo')).toBe('bar');
    });

    beforeEach(() => {
      store.set('testFramework', 'mocha');
      store.set('name', 'test');
    });

    it('get values', () => {
      expect(store.get('testFramework')).toBe('mocha');
      expect(store.get('name')).toBe('test');
    });
  });

  describe('#set()', () => {
    let store: Storage;

    beforeEach(() => {
      store = new Storage('test', editor, storePath);
      store.set('foo', 'bar');
    });

    it('set values', () => {
      store.set('name', 'Yeoman!');
      expect(store.get('name')).toBe('Yeoman!');
    });

    it('set multiple values at once', () => {
      store.set({ foo: 'bar', john: 'doe' });
      expect(store.get('foo')).toBe('bar');
      expect(store.get('john')).toBe('doe');
    });

    it('throws when invalid JSON values are passed', () => {
      expect(store.set.bind(this, 'foo', () => {})).toThrow();
    });

    it('save on each changes', () => {
      store.set('foo', 'bar');
      expect(editor.readJSON(storePath)?.test.foo).toBe('bar');
      store.set('foo', 'oo');
      expect(editor.readJSON(storePath)?.test.foo).toBe('oo');
    });

    describe('@return', () => {
      beforeEach(() => {
        storePath = path.join(tmpdir, 'setreturn.json');
        store = new Storage('test', editor, storePath);
      });

      afterEach(() => {
        rm(storePath);
      });

      it('the saved value (with key)', () => {
        expect(store.set('name', 'Yeoman!')).toBe('Yeoman!');
      });

      it('the saved value (without key)', () => {
        expect(store.set({ foo: 'bar', john: 'doe' })).toEqual({
          foo: 'bar',
          john: 'doe',
        });
      });

      it('the saved value (update values)', () => {
        store.set({ foo: 'bar', john: 'doe' });
        expect(store.set({ foo: 'moo' })).toEqual({
          foo: 'moo',
          john: 'doe',
        });
      });
    });

    describe('when multiples instances share the same file', () => {
      let store: Storage;
      let store2: Storage;

      beforeEach(() => {
        store = new Storage('test', editor, storePath);
        store.set('foo', 'bar');
        store2 = new Storage('test2', editor, storePath);
      });

      it('only update modified namespace', () => {
        store2.set('bar', 'foo');
        store.set('foo', 'bar');

        const json = editor.readJSON(storePath);
        expect(json.test.foo).toBe('bar');
        expect(json.test2.bar).toBe('foo');
      });
    });

    describe('when multiples instances share the same namespace', () => {
      let store: Storage;
      let store2: Storage;

      beforeEach(() => {
        store = new Storage('test', editor, storePath);
        store.set('foo', 'bar');
        store2 = new Storage('test', editor, storePath);
      });

      it('only update modified namespace', () => {
        store2.set('bar', 'foo');
        store.set('foo', 'bar');

        expect(store2.get('foo')).toBe('bar');
        expect(store.get('bar')).toBe('foo');

        const json = editor.readJSON(storePath);
        expect(json.test.foo).toBe('bar');
        expect(json.test.bar).toBe('foo');
      });
    });
  });

  describe('#getAll()', () => {
    let store: Storage;

    beforeEach(() => {
      store = new Storage('test', editor, storePath);
      store.set('foo', 'bar');
    });

    beforeEach(() => {
      store.set({ foo: 'bar', john: 'doe' });
    });

    it('get all values', () => {
      expect(store.getAll().foo).toEqual('bar');
    });

    it('does not return a reference to the inner store', () => {
      store.getAll().foo = 'uhoh';
      expect(store.getAll().foo).toBe('bar');
    });
  });

  describe('#delete()', () => {
    let store: Storage;

    beforeEach(() => {
      store = new Storage('test', editor, storePath);
      store.set('foo', 'bar');
      store.set('name', 'test');
    });

    it('delete value', () => {
      store.delete('name');
      expect(store.get('name')).toBe(undefined);
    });
  });

  describe('#defaults()', () => {
    let store: Storage;

    beforeEach(() => {
      store = new Storage('test', editor, storePath);
      store.set('foo', 'bar');
      store.set('val1', 1);
    });

    it('set defaults values if not predefined', () => {
      store.defaults({ val1: 3, val2: 4 });

      expect(store.get('val1')).toBe(1);
      expect(store.get('val2')).toBe(4);
    });

    it('require an Object as argument', () => {
      expect(() => store.defaults('foo')).toThrow();
    });

    describe('@return', () => {
      beforeEach(() => {
        storePath = path.join(tmpdir, 'defaultreturn.json');
        store = new Storage('test', editor, storePath);
        store.set('val1', 1);
        store.set('foo', 'bar');
      });

      afterEach(() => {
        rm(storePath);
      });

      it('the saved value when passed an empty object', () => {
        expect(store.defaults({})).toEqual({ foo: 'bar', val1: 1 });
      });

      it('the saved value when passed the same key', () => {
        expect(store.defaults({ foo: 'baz' })).toEqual({
          foo: 'bar',
          val1: 1,
        });
      });

      it('the saved value when passed new key', () => {
        expect(store.defaults({ food: 'pizza' })).toEqual({
          foo: 'bar',
          val1: 1,
          food: 'pizza',
        });
      });
    });
  });

  describe('#merge()', () => {
    let store: Storage;

    beforeEach(() => {
      store = new Storage('test', editor, storePath);
      store.set('foo', 'bar');
      store.set('val1', 1);
    });

    it('should merge values if not predefined', () => {
      store.merge({ val1: 3, val2: 4 });

      expect(store.get('val1')).toBe(3);
      expect(store.get('val2')).toBe(4);
    });

    it('should require an Object as argument', () => {
      expect(() => store.defaults('foo')).toThrow();
    });

    describe('@return', () => {
      beforeEach(() => {
        storePath = path.join(tmpdir, 'defaultreturn.json');
        store = new Storage('test', editor, storePath);
        store.set('val1', 1);
        store.set('foo', 'bar');
      });

      afterEach(() => {
        rm(storePath);
      });

      it('should return the original object', () => {
        expect(store.merge({})).toStrictEqual({ foo: 'bar', val1: 1 });
      });

      it('should return an object with replaced values', () => {
        expect(store.merge({ foo: 'baz' })).toStrictEqual({
          foo: 'baz',
          val1: 1,
        });
      });

      it('should return an object with new values', () => {
        expect(store.merge({ food: 'pizza' })).toStrictEqual({
          foo: 'bar',
          val1: 1,
          food: 'pizza',
        });
      });
    });
  });

  describe('with namespace', () => {
    let store: Storage;

    beforeEach(() => {
      store = new Storage('test', editor, storePath);
      store.set('foo', 'bar');
    });

    it('stores sharing the same store file with and without namespace', () => {
      const localstore = new Storage(editor, storePath);
      localstore.set('test', { bar: 'foo' });
      expect(store.get('bar')).toBe('foo');
    });
  });

  describe('#getPath() & #setPath()', () => {
    let store: Storage;

    beforeEach(() => {
      store = new Storage('test', editor, storePath);
      store.set('foo', 'bar');
    });

    it('#getPath() & #setPath()', () => {
      store.set('name', { name: 'test' });
      expect(store.getPath('name')).toBeTruthy();
      expect(store.getPath('name.name')).toBe('test');
      expect(store.setPath('name.name', 'changed')).toBe('changed');
      expect(store.getPath('name.name')).toBe('changed');
      expect(store.get('name').name).toBe('changed');
    });
  });

  describe('#getStorage()', () => {
    let store: Storage<{ foo: 'bar'; name: string; 'path.key': { name: string }; path: { name: string } }>;

    beforeEach(() => {
      store = new Storage('test', editor, storePath);
      store.set('foo', 'bar');
    });
    describe('with a path safe string', () => {
      let pathStore: Storage;
      beforeEach(() => {
        pathStore = store.createStorage('path');
      });

      it('should get and set value', () => {
        expect(pathStore.setPath('name', 'initial')).toBe('initial');
        expect(store.get('path').name).toBe('initial');
        expect(store.getPath('path').name).toBe('initial');
        store.set('path', { name: 'test' });
        expect(pathStore.get('name')).toBe('test');
        pathStore.set('name', 'changed');
        expect(store.get('path').name).toBe('changed');
      });
    });
    describe('with a path unsafe string', () => {
      const keyName = 'path.key';
      let pathStore: Storage;

      beforeEach(() => {
        pathStore = store.createStorage(`["${keyName}"]`);
      });

      it('should get and set value', () => {
        expect(pathStore.setPath('name', 'initial')).toBe('initial');
        expect(store.get(keyName).name).toBe('initial');
        // @ts-expect-error pattern not supported by types
        expect(store.getPath(`["${keyName}"]`).name).toBe('initial');
        store.set(keyName, { name: 'test' });
        expect(pathStore.get('name')).toBe('test');
        pathStore.set('name', 'changed');
        expect(store.get(keyName).name).toBe('changed');
      });
    });
  });

  describe('.constructor() with lodashPath', () => {
    let store: Storage;
    let pathStore: Storage;

    beforeEach(() => {
      store = new Storage('test', editor, storePath);
      store.set('foo', 'bar');
      pathStore = new Storage('test.path', editor, storePath, { lodashPath: true });
    });

    it('get and set value', () => {
      expect(pathStore.setPath('name', 'initial')).toBe('initial');
      expect(store.get('path').name).toBe('initial');
      store.set('path', { name: 'test' });
      expect(pathStore.get('name')).toBe('test');
      pathStore.set('name', 'changed');
      expect(store.get('path').name).toBe('changed');
    });
  });

  describe('#createProxy()', () => {
    let store: Storage;
    let proxy: Record<string, any>;
    beforeEach(() => {
      store = new Storage('test', editor, storePath);
      store.set('foo', 'bar');
      proxy = store.createProxy();
    });

    it('sets values', () => {
      proxy.name = 'Yeoman!';
      expect(store.get('name')).toBe('Yeoman!');
    });

    it('sets multiple values at once', () => {
      Object.assign(proxy, { foo: 'bar', john: 'doe' });
      expect(store.get('foo')).toBe('bar');
      expect(store.get('john')).toBe('doe');
    });

    it('gets values', () => {
      store.set('name', 'Yeoman!');
      expect(proxy.name).toBe('Yeoman!');
    });

    it('works with spread operator', () => {
      store.set({ foo: 'bar', john: 'doe' });

      const spread = { ...proxy };
      expect(spread.foo).toBe('bar');
      expect(spread.john).toBe('doe');
    });

    it('works with in operator', () => {
      store.set({ foo: 'bar', john: 'doe' });
      expect('foo' in proxy).toBeTruthy();
      expect('foo2' in proxy).toBeFalsy();
    });

    it('works with deepEquals', () => {
      store.set({ foo: 'bar', john: 'doe' });
      expect({ ...proxy }).toStrictEqual({ foo: 'bar', john: 'doe' });
    });
  });

  describe('caching', () => {
    let store: Storage;

    beforeEach(() => {
      store = new Storage('test', editor, storePath);
      store.set('foo', 'bar');

      // Make sure the cache is loaded.
      // on instantiation a change event is emitted when the file loads to mem-fs
      store.get('foo');
    });

    it('should load', () => {
      expect(store._cachedStore).toBeTruthy();
    });

    it('should not load when disabled', () => {
      const store = new Storage('test', editor, storePath, {
        disableCache: true,
      });
      expect(store._cachedStore === undefined).toBeTruthy();
      store.get('foo');
      expect(store._cachedStore === undefined).toBeTruthy();
    });

    it('cleanups when the file changes', () => {
      editor.writeJSON(store.path, {});
      expect(store._cachedStore === undefined).toBeTruthy();
    });

    it("doesn't cleanup when another file changes", () => {
      editor.write('a.txt', 'anything');
      expect(store._cachedStore).toBeTruthy();
    });

    it('cleanups when per file cache is disabled and another file changes', () => {
      editor.writeJSON(store.path, { disableCacheByFile: true });
      editor.write('a.txt', 'anything');
      expect(store._cachedStore === undefined).toBeTruthy();
    });

    // Compatibility for mem-fs <= 1.1.3
    it('cleanups when change event argument is undefined', () => {
      memFsInstance.emit('change');
      expect(store._cachedStore === undefined).toBeTruthy();
    });
  });

  describe('non sorted store', () => {
    let store: Storage;

    beforeEach(() => {
      store = new Storage('test', editor, storePath);
      store.set('foo', 'bar');
      store.set('bar', 'foo');
      store.set('array', [3, 2, 1]);
    });
    it('should write non sorted file', () => {
      expect(editor.read(storePath)).toBe(`{
  "test": {
    "foo": "bar",
    "bar": "foo",
    "array": [
      3,
      2,
      1
    ]
  }
}
`);
    });
  });

  describe('sorted store', () => {
    let store: Storage;

    beforeEach(() => {
      store = new Storage('test', editor, storePath, {
        sorted: true,
      });
      store.set('foo', 'bar');
      store.set('bar', 'foo');
      store.set('array', [3, 2, 1]);
      store.set('object', { b: 'shouldBeLast', a: 'shouldBeFirst' });
    });
    it('should write sorted file', () => {
      expect(editor.read(storePath)).toBe(`{
  "test": {
    "array": [
      3,
      2,
      1
    ],
    "bar": "foo",
    "foo": "bar",
    "object": {
      "a": "shouldBeFirst",
      "b": "shouldBeLast"
    }
  }
}
`);
    });
  });

  describe('transform', () => {
    let store: Storage;

    beforeEach(() => {
      store = new Storage('test', editor, storePath, {
        transform: obj => ({ transformed: obj }),
      });
      store.set('foo', 'bar');
      store.set('bar', 'foo');
      store.set('array', [3, 2, 1]);
      store.set('object', { b: 'shouldBeLast', a: 'shouldBeFirst' });
    });

    it('proxy should not be transformed', () => {
      const proxy = store.createProxy();
      expect(proxy).toMatchObject({
        array: [3, 2, 1],
        bar: 'foo',
        foo: 'bar',
        object: {
          a: 'shouldBeFirst',
          b: 'shouldBeLast',
        },
      });
    });

    it('proxy should be edit the store', () => {
      const proxy = store.createProxy();
      proxy.foo = 'changed';
      expect(store.get('transformed').foo).toBe('changed');
    });

    it('should read file', () => {
      expect(store.getAll()).toMatchInlineSnapshot(`
        {
          "transformed": {
            "array": [
              3,
              2,
              1,
            ],
            "bar": "foo",
            "foo": "bar",
            "object": {
              "a": "shouldBeFirst",
              "b": "shouldBeLast",
            },
          },
        }
      `);
    });
  });
});
