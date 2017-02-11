'use strict';
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const FileEditor = require('mem-fs-editor');
const env = require('yeoman-environment');
const helpers = require('yeoman-test');
const Storage = require('../lib/util/storage');

const tmpdir = path.join(os.tmpdir(), 'yeoman-storage');

function rm(filepath) {
  if (fs.existsSync(filepath)) {
    fs.unlinkSync(path);
  }
}

describe('Storage', () => {
  before(helpers.setUpTestDirectory(tmpdir));

  beforeEach(function () {
    this.beforeDir = process.cwd();
    this.storePath = path.join(tmpdir, 'new-config.json');
    this.memFs = env.createEnv().sharedFs;
    this.fs = FileEditor.create(this.memFs);
    this.store = new Storage('test', this.fs, this.storePath);
    this.store.set('foo', 'bar');
  });

  afterEach(function () {
    rm(this.storePath);
    process.chdir(this.beforeDir);
  });

  describe('.constructor()', () => {
    it('require a name parameter', () => {
      assert.throws(() => {
        new Storage(); // eslint-disable-line no-new
      });
    });

    it('take a path parameter', function () {
      const store = new Storage('test', this.fs, path.join(__dirname, './fixtures/config.json'));
      assert.equal(store.get('testFramework'), 'mocha');
      assert.ok(store.existed);
    });
  });

  it('namespace each store sharing the same store file', function () {
    const store = new Storage('foobar', this.fs, this.storePath);
    store.set('foo', 'something else');
    assert.equal(this.store.get('foo'), 'bar');
  });

  it('a config path is required', () => {
    assert.throws(function () {
      new Storage('yo', this.fs); // eslint-disable-line no-new
    });
  });

  describe('#get()', () => {
    beforeEach(function () {
      this.store.set('testFramework', 'mocha');
      this.store.set('name', 'test');
    });

    it('get values', function () {
      assert.equal(this.store.get('testFramework'), 'mocha');
      assert.equal(this.store.get('name'), 'test');
    });
  });

  describe('#set()', () => {
    it('set values', function () {
      this.store.set('name', 'Yeoman!');
      assert.equal(this.store.get('name'), 'Yeoman!');
    });

    it('set multipe values at once', function () {
      this.store.set({foo: 'bar', john: 'doe'});
      assert.equal(this.store.get('foo'), 'bar');
      assert.equal(this.store.get('john'), 'doe');
    });

    it('throws when invalid JSON values are passed', function () {
      assert.throws(this.store.set.bind(this, 'foo', () => {}));
    });

    it('save on each changes', function () {
      this.store.set('foo', 'bar');
      assert.equal(this.fs.readJSON(this.storePath).test.foo, 'bar');
      this.store.set('foo', 'oo');
      assert.equal(this.fs.readJSON(this.storePath).test.foo, 'oo');
    });

    describe('@return', () => {
      beforeEach(function () {
        this.storePath = path.join(tmpdir, 'setreturn.json');
        this.store = new Storage('test', this.fs, this.storePath);
      });

      afterEach(function () {
        rm(this.storePath);
      });

      it('the saved value (with key)', function () {
        assert.equal(this.store.set('name', 'Yeoman!'), 'Yeoman!');
      });

      it('the saved value (without key)', function () {
        assert.deepEqual(
          this.store.set({foo: 'bar', john: 'doe'}),
          {foo: 'bar', john: 'doe'}
        );
      });

      it('the saved value (update values)', function () {
        this.store.set({foo: 'bar', john: 'doe'});
        assert.deepEqual(
          this.store.set({foo: 'moo'}),
          {foo: 'moo', john: 'doe'}
        );
      });
    });

    describe('when multiples instances share the same file', () => {
      beforeEach(function () {
        this.store = new Storage('test', this.fs, this.storePath);
        this.store.set('foo', 'bar');
        this.store2 = new Storage('test2', this.fs, this.storePath);
      });

      it('only update modified namespace', function () {
        this.store2.set('bar', 'foo');
        this.store.set('foo', 'bar');

        const json = this.fs.readJSON(this.storePath);
        assert.equal(json.test.foo, 'bar');
        assert.equal(json.test2.bar, 'foo');
      });
    });

    describe('when multiples instances share the same namespace', () => {
      beforeEach(function () {
        this.store = new Storage('test', this.fs, this.storePath);
        this.store.set('foo', 'bar');
        this.store2 = new Storage('test', this.fs, this.storePath);
      });

      it('only update modified namespace', function () {
        this.store2.set('bar', 'foo');
        this.store.set('foo', 'bar');

        const json = this.fs.readJSON(this.storePath);
        assert.equal(json.test.foo, 'bar');
        assert.equal(json.test.bar, 'foo');
      });
    });
  });

  describe('#getAll()', () => {
    beforeEach(function () {
      this.store.set({foo: 'bar', john: 'doe'});
    });

    it('get all values', function () {
      assert.deepEqual(this.store.getAll().foo, 'bar');
    });

    it('does not return a reference to the inner store', function () {
      this.store.getAll().foo = 'uhoh';
      assert.equal(this.store.getAll().foo, 'bar');
    });
  });

  describe('#delete()', () => {
    beforeEach(function () {
      this.store.set('name', 'test');
    });

    it('delete value', function () {
      this.store.delete('name');
      assert.equal(this.store.get('name'), undefined);
    });
  });

  describe('#defaults()', () => {
    beforeEach(function () {
      this.store.set('val1', 1);
    });

    it('set defaults values if not predefined', function () {
      this.store.defaults({val1: 3, val2: 4});

      assert.equal(this.store.get('val1'), 1);
      assert.equal(this.store.get('val2'), 4);
    });

    it('require an Object as argument', function () {
      assert.throws(this.store.defaults.bind(this.store, 'foo'));
    });

    describe('@return', () => {
      beforeEach(function () {
        this.storePath = path.join(tmpdir, 'defaultreturn.json');
        this.store = new Storage('test', this.fs, this.storePath);
        this.store.set('val1', 1);
        this.store.set('foo', 'bar');
      });

      afterEach(function () {
        rm(this.storePath);
      });

      it('the saved value when passed an empty object', function () {
        assert.deepEqual(this.store.defaults({}), {foo: 'bar', val1: 1});
      });

      it('the saved value when passed the same key', function () {
        assert.deepEqual(
          this.store.defaults({foo: 'baz'}),
          {foo: 'bar', val1: 1}
        );
      });

      it('the saved value when passed new key', function () {
        assert.deepEqual(
          this.store.defaults({food: 'pizza'}),
          {foo: 'bar', val1: 1, food: 'pizza'}
        );
      });
    });
  });
});
