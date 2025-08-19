import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { type MemFsEditor, create as createMemFsEditor } from 'mem-fs-editor';
import helpers from 'yeoman-test';
import { type Store, create as createMemFs } from 'mem-fs';
import Storage from '../src/util/storage.js';
import { afterEach, beforeEach, describe, it } from 'vitest';

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
      assert.ok(json!.endsWith('\n'));
      assert.ok(!json!.endsWith('\n\n'));
      rm(storePath);
      process.chdir(beforeDir);
    }
  });

  describe('.constructor()', () => {
    it('require a parameter', () => {
      assert.throws(() => {
        // @ts-expect-error invalid arguments
        new Storage();
      });
    });

    it('require at least 2 parameter', () => {
      assert.throws(() => {
        // @ts-expect-error invalid arguments
        new Storage({});
      });
    });

    it('take a path parameter', () => {
      const store = new Storage('test', editor, path.join(_dirname, './fixtures/config.json'));
      assert.equal(store.get('testFramework'), 'mocha');
      assert.ok(store.existed);
    });

    it('take a fs and path parameter without name', () => {
      const store = new Storage(editor, path.join(_dirname, './fixtures/config.json'));
      assert.equal(store.get('test')!.testFramework, 'mocha');
      assert.ok(store.existed);
    });
  });

  it('a config path is required', () => {
    assert.throws(() => {
      // @ts-expect-error invalid arguments
      new Storage('yo', editor);
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
      assert.equal(store.get('foo'), 'bar');
    });

    beforeEach(() => {
      store.set('testFramework', 'mocha');
      store.set('name', 'test');
    });

    it('get values', () => {
      assert.equal(store.get('testFramework'), 'mocha');
      assert.equal(store.get('name'), 'test');
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
      assert.equal(store.get('name'), 'Yeoman!');
    });

    it('set multiple values at once', () => {
      store.set({ foo: 'bar', john: 'doe' });
      assert.equal(store.get('foo'), 'bar');
      assert.equal(store.get('john'), 'doe');
    });

    it('throws when invalid JSON values are passed', function () {
      assert.throws(store.set.bind(this, 'foo', () => {}));
    });

    it('save on each changes', () => {
      store.set('foo', 'bar');
      assert.equal(editor.readJSON(storePath).test.foo, 'bar');
      store.set('foo', 'oo');
      assert.equal(editor.readJSON(storePath).test.foo, 'oo');
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
        assert.equal(store.set('name', 'Yeoman!'), 'Yeoman!');
      });

      it('the saved value (without key)', () => {
        assert.deepEqual(store.set({ foo: 'bar', john: 'doe' }), {
          foo: 'bar',
          john: 'doe',
        });
      });

      it('the saved value (update values)', () => {
        store.set({ foo: 'bar', john: 'doe' });
        assert.deepEqual(store.set({ foo: 'moo' }), {
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
        assert.equal(json.test.foo, 'bar');
        assert.equal(json.test2.bar, 'foo');
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

        assert.equal(store2.get('foo'), 'bar');
        assert.equal(store.get('bar'), 'foo');

        const json = editor.readJSON(storePath);
        assert.equal(json.test.foo, 'bar');
        assert.equal(json.test.bar, 'foo');
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
      assert.deepEqual(store.getAll().foo, 'bar');
    });

    it('does not return a reference to the inner store', () => {
      store.getAll().foo = 'uhoh';
      assert.equal(store.getAll().foo, 'bar');
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
      assert.equal(store.get('name'), undefined);
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

      assert.equal(store.get('val1'), 1);
      assert.equal(store.get('val2'), 4);
    });

    it('require an Object as argument', () => {
      assert.throws(store.defaults.bind(store, 'foo'));
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
        assert.deepEqual(store.defaults({}), { foo: 'bar', val1: 1 });
      });

      it('the saved value when passed the same key', () => {
        assert.deepEqual(store.defaults({ foo: 'baz' }), {
          foo: 'bar',
          val1: 1,
        });
      });

      it('the saved value when passed new key', () => {
        assert.deepEqual(store.defaults({ food: 'pizza' }), {
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

      assert.strictEqual(store.get('val1'), 3);
      assert.strictEqual(store.get('val2'), 4);
    });

    it('should require an Object as argument', () => {
      assert.throws(store.defaults.bind(store, 'foo'));
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
        assert.deepStrictEqual(store.merge({}), { foo: 'bar', val1: 1 });
      });

      it('should return an object with replaced values', () => {
        assert.deepStrictEqual(store.merge({ foo: 'baz' }), {
          foo: 'baz',
          val1: 1,
        });
      });

      it('should return an object with new values', () => {
        assert.deepStrictEqual(store.merge({ food: 'pizza' }), {
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
      assert.equal(store.get('bar'), 'foo');
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
      assert.ok(store.getPath('name'));
      assert.equal(store.getPath('name.name'), 'test');
      assert.equal(store.setPath('name.name', 'changed'), 'changed');
      assert.equal(store.getPath('name.name'), 'changed');
      assert.equal(store.get('name').name, 'changed');
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
        assert.equal(pathStore.setPath('name', 'initial'), 'initial');
        assert.equal(store.get('path').name, 'initial');
        assert.equal(store.getPath('path').name, 'initial');
        store.set('path', { name: 'test' });
        assert.equal(pathStore.get('name'), 'test');
        pathStore.set('name', 'changed');
        assert.equal(store.get('path').name, 'changed');
      });
    });
    describe('with a path unsafe string', () => {
      const keyName = 'path.key';
      let pathStore: Storage;

      beforeEach(() => {
        pathStore = store.createStorage(`["${keyName}"]`);
      });

      it('should get and set value', () => {
        assert.equal(pathStore.setPath('name', 'initial'), 'initial');
        assert.equal(store.get(keyName).name, 'initial');
        // @ts-expect-error pattern not supported by types
        assert.equal(store.getPath(`["${keyName}"]`).name, 'initial');
        store.set(keyName, { name: 'test' });
        assert.equal(pathStore.get('name'), 'test');
        pathStore.set('name', 'changed');
        assert.equal(store.get(keyName).name, 'changed');
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
      assert.equal(pathStore.setPath('name', 'initial'), 'initial');
      assert.equal(store.get('path').name, 'initial');
      store.set('path', { name: 'test' });
      assert.equal(pathStore.get('name'), 'test');
      pathStore.set('name', 'changed');
      assert.equal(store.get('path').name, 'changed');
    });
  });

  describe('#createProxy()', () => {
    let store: Storage;
    let proxy;
    beforeEach(() => {
      store = new Storage('test', editor, storePath);
      store.set('foo', 'bar');
      proxy = store.createProxy();
    });

    it('sets values', () => {
      proxy.name = 'Yeoman!';
      assert.equal(store.get('name'), 'Yeoman!');
    });

    it('sets multiple values at once', () => {
      Object.assign(proxy, { foo: 'bar', john: 'doe' });
      assert.equal(store.get('foo'), 'bar');
      assert.equal(store.get('john'), 'doe');
    });

    it('gets values', () => {
      store.set('name', 'Yeoman!');
      assert.equal(proxy.name, 'Yeoman!');
    });

    it('works with spread operator', () => {
      store.set({ foo: 'bar', john: 'doe' });

      const spread = { ...proxy };
      assert.equal(spread.foo, 'bar');
      assert.equal(spread.john, 'doe');
    });

    it('works with in operator', () => {
      store.set({ foo: 'bar', john: 'doe' });
      assert.ok('foo' in proxy);
      assert.ok(!('foo2' in proxy));
    });

    it('works with deepEquals', () => {
      store.set({ foo: 'bar', john: 'doe' });
      assert.deepStrictEqual({ ...proxy }, { foo: 'bar', john: 'doe' });
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
      assert.ok(store._cachedStore);
    });

    it('should not load when disabled', () => {
      const store = new Storage('test', editor, storePath, {
        disableCache: true,
      });
      assert.ok(store._cachedStore === undefined);
      store.get('foo');
      assert.ok(store._cachedStore === undefined);
    });

    it('cleanups when the file changes', () => {
      editor.writeJSON(store.path, {});
      assert.ok(store._cachedStore === undefined);
    });

    it("doesn't cleanup when another file changes", () => {
      editor.write('a.txt', 'anything');
      assert.ok(store._cachedStore);
    });

    it('cleanups when per file cache is disabled and another file changes', () => {
      editor.writeJSON(store.path, { disableCacheByFile: true });
      editor.write('a.txt', 'anything');
      assert.ok(store._cachedStore === undefined);
    });

    // Compatibility for mem-fs <= 1.1.3
    it('cleanups when change event argument is undefined', () => {
      memFsInstance.emit('change');
      assert.ok(store._cachedStore === undefined);
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
      assert.strictEqual(
        editor.read(storePath),
        `{
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
`,
      );
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
      assert.strictEqual(
        editor.read(storePath),
        `{
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
`,
      );
    });
  });
});
