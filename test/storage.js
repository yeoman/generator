/*global describe, it, before, after, beforeEach, afterEach */
'use strict';
var assert = require('assert');
var FileEditor = require('mem-fs-editor');
var fs = require('fs');
var os = require('os');
var path = require('path');
var sinon = require('sinon');
var env = require('yeoman-environment');
var Storage = require('../lib/util/storage');
var generators = require('../');
var helpers = generators.test;
var tmpdir = path.join(os.tmpdir(), 'yeoman-storage');

function rm(path) {
  if (fs.existsSync(path)) {
    fs.unlinkSync(path);
  }
}

describe('Storage', function () {
  before(helpers.setUpTestDirectory(tmpdir));

  beforeEach(function () {
    this.beforeDir = process.cwd();
    this.storePath = path.join(tmpdir, 'new-config.json');
    this.memFs = env.createEnv().sharedFs;
    this.fs = FileEditor.create(this.memFs);
    this.store = new Storage('test', this.fs, this.storePath);
    this.store.set('foo', 'bar');
    this.saveSpy = sinon.spy(this.store, 'save');
  });

  afterEach(function () {
    rm(this.storePath);
    process.chdir(this.beforeDir);
  });

  describe('.constructor()', function () {
    it('require a name parameter', function () {
      assert.throws(function () { new Storage(); });
    });

    it('take a path parameter', function () {
      var store = new Storage('test', this.fs, path.join(__dirname, './fixtures/config.json'));
      assert.equal(store.get('testFramework'), 'mocha');
      assert.ok(store.existed);
    });
  });

  it('namespace each store sharing the same store file', function () {
    var store = new Storage('foobar', this.fs, this.storePath);
    store.set('foo', 'something else');
    assert.equal(this.store.get('foo'), 'bar');
  });

  it('a config path is required', function () {
    assert.throws(function () {
      new Storage('yo', this.fs);
    });
  });

  describe('#get()', function () {
    beforeEach(function () {
      this.store.set('testFramework', 'mocha');
      this.store.set('name', 'test');
    });

    it('get values', function () {
      assert.equal(this.store.get('testFramework'), 'mocha');
      assert.equal(this.store.get('name'), 'test');
    });
  });

  describe('#set()', function () {
    it('set values', function () {
      this.store.set('name', 'Yeoman!');
      assert.equal(this.store.get('name'), 'Yeoman!');
    });

    it('set multipe values at once', function () {
      this.store.set({ foo: 'bar', john: 'doe' });
      assert.equal(this.store.get('foo'), 'bar');
      assert.equal(this.store.get('john'), 'doe');
    });

    it('throws when invalid JSON values are passed', function () {
      assert.throws(this.store.set.bind(this, 'foo', function () {}));
    });

    it('save on each changes', function () {
      this.store.set('foo', 'bar');
      assert.equal(this.saveSpy.callCount, 1);
      this.store.set('foo', 'oo');
      assert.equal(this.saveSpy.callCount, 2);
    });

    describe('@return', function () {
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
          this.store.set({ foo: 'bar', john: 'doe' }),
          { foo: 'bar', john: 'doe' }
        );
      });

      it('the saved value (update values)', function () {
        this.store.set({ foo: 'bar', john: 'doe' });
        assert.deepEqual(
          this.store.set({ foo: 'moo' }),
          { foo: 'moo', john: 'doe' }
        );
      });
    });
  });

  describe('#getAll()', function () {
    beforeEach(function () {
      this.store.set({ foo: 'bar', john: 'doe' });
    });

    it('get all values', function () {
      assert.deepEqual(this.store.getAll().foo, 'bar');
    });

    it('does not return a reference to the inner store', function () {
      this.store.getAll().foo = 'uhoh';
      assert.equal(this.store.getAll().foo, 'bar');
    });
  });

  describe('#delete()', function () {
    beforeEach(function () {
      this.store.set('name', 'test');
    });

    it('delete value', function () {
      this.store.delete('name');
      assert.equal(this.store.get('name'), undefined);
    });
  });

  describe('#save()', function () {
    beforeEach(function () {
      this.saveStorePath = path.join(tmpdir, 'save.json');
      rm(this.saveStorePath);
      this.store = new Storage('test', this.fs, this.saveStorePath);
      this.store.set('foo', 'bar');
      this.saveSpy = sinon.spy(this.store, 'save');
    });

    describe('when multiples instances share the same file', function () {
      beforeEach(function () {
        this.store2 = new Storage('test2', this.fs, this.saveStorePath);
      });

      it('only update modified namespace', function () {
        this.store2.set('bar', 'foo');
        this.store.set('foo', 'bar');

        var json = this.fs.readJSON(this.saveStorePath);
        assert.equal(json.test.foo, 'bar');
        assert.equal(json.test2.bar, 'foo');
      });
    });

    describe('when multiples instances share the same namespace', function () {
      beforeEach(function () {
        this.store2 = new Storage('test', this.fs, this.saveStorePath);
      });

      it('only update modified namespace', function () {
        this.store2.set('bar', 'foo');
        this.store.set('foo', 'bar');

        var json = this.fs.readJSON(this.saveStorePath);
        assert.equal(json.test.foo, 'bar');
        assert.equal(json.test.bar, 'foo');
      });
    });
  });

  describe('#defaults()', function () {
    beforeEach(function () {
      this.store.set('val1', 1);
    });

    it('set defaults values if not predefined', function () {
      this.store.defaults({ val1: 3, val2: 4 });

      assert.equal(this.store.get('val1'), 1);
      assert.equal(this.store.get('val2'), 4);
    });

    it('require an Object as argument', function () {
      assert.throws(this.store.defaults.bind(this.store, 'foo'));
    });

    describe('@return', function () {
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
        assert.deepEqual(this.store.defaults({}), { foo: 'bar', val1: 1 });
      });

      it('the saved value when passed the same key', function () {
        assert.deepEqual(
          this.store.defaults({ foo: 'baz' }),
          { foo: 'bar', val1: 1 }
        );
      });

      it('the saved value when passed new key', function () {
        assert.deepEqual(
          this.store.defaults({ food: 'pizza' }),
          { foo: 'bar', val1: 1, food: 'pizza' }
        );
      });
    });
  });
});
