/*global describe, it, before, after, beforeEach, afterEach */
var path = require('path');
var fs = require('fs');
var assert = require('assert');
var _ = require('lodash');
var shell = require('shelljs');
var sinon = require('sinon');
var Storage = require('../lib/util/storage');

describe('Generator storage', function () {
  before(function () {
    this.storePath = path.join(__dirname, './fixtures/config.json');
  });

  it('should require a name parameter', function () {
    assert.throws(function () { new Storage(); });
  });

  it('constructor should take a path parameter', function () {
    var store = new Storage('test', this.storePath);
    assert.equal(store.get('testFramework'), 'mocha');
    assert.ok(store.existed);
  });

  it('should create a new config file on `set`', function (done) {
    var storePath = path.join(shell.tempdir(), 'new-config.json');
    var store = new Storage('test', storePath);

    store.once('save', function () {
      var fileContent = JSON.parse(fs.readFileSync(storePath));
      shell.rm('-f', storePath);
      assert.equal(fileContent.test.foo, 'bar');
      assert.ok(!store.existed);
      done();
    }.bind(this));

    store.set('foo', 'bar');
  });

  it('should default to `.yo-rc.json` file', function () {
    var cwd = process.cwd();
    var tmp = shell.tempdir();
    process.chdir(tmp);
    var store = new Storage('yo');

    store.on('save', function () {
      var fileContent = JSON.parse(fs.readFileSync(path.join(tmp, '.yo-rc.json')));
      assert.equal(fileContent.yo.foo, 'bar');
      process.chdir(cwd);
    });

    store.set('foo', 'bar');
  });

  describe('instance methods', function () {

    beforeEach(function () {
      this.store = new Storage('test', this.storePath);
      this.initialState = _.cloneDeep(this.store._fullStore);
    });

    afterEach(function (done) {
      this.store._fullStore = this.initialState;
      this.store.on('save', done);
      this.store.save();
    });

    it('should get values', function () {
      assert.equal(this.store.get('testFramework'), 'mocha');
      assert.equal(this.store.get('name'), 'test');
    });

    it('should set values', function () {
      this.store.set('name', 'Yeoman!');
      assert.equal(this.store.get('name'), 'Yeoman!');
    });

    it('should set multipe values at once', function () {
      this.store.set({
        foo: 'bar',
        john: 'doe'
      });
      assert.equal(this.store.get('foo'), 'bar');
      assert.equal(this.store.get('john'), 'doe');
    });

    it('should get all values', function () {
      var val = this.store.getAll();
      assert.notEqual(val, this.store._store); // must not return the reference
      _.each(this.store._store, function (method, name) {
        assert(method === val[name]);
      });
    });

    it('should delete value', function () {
      assert.equal(this.store.get('name'), 'test');
      this.store.delete('name');
      assert.equal(this.store.get('name'), undefined);
    });

    it('should prevent saving `function` value', function () {
      assert.throws(function () {
        this.store.set('foo', function () {});
      }.bind(this));
    });

    it('should init new name config', function () {
      var store = new Storage('foobar', this.storePath);
      store.set('foo', 'bar');
      assert.equal(store.get('foo'), 'bar');
      assert.ok(this.store.get('foo') == null);
    });

    it('should initialize storage file on `save`', function (done) {
      var storePath = path.join(shell.tempdir(), 'save.json');
      var store = new Storage('test', storePath);

      store.once('save', function () {
        var fileContent = JSON.parse(fs.readFileSync(storePath));
        assert.ok(fileContent);
        assert.ok(!store.existed);
        shell.rm('-f', storePath);
        done()
      });

      store.save();
    });

    it('should debounce save method', function (done) {
      var spy = sinon.spy(Storage.prototype, 'forceSave');
      var store = new Storage('name', path.join(shell.tempdir(), 'foo.json'));
      var saveSpy = sinon.spy(store, 'save');

      store.once('save', function () {
        assert.equal(spy.callCount, 1);
        assert.equal(saveSpy.callCount, 3);
        spy.restore();
        done();
      });

      store.save();
      store.save();
      store.save();
    });

    it('should allow setting defaults', function () {
      this.store.set('val1', 1);
      this.store.defaults({
        'val1': 3,
        'val2': 4
      });

      assert.equal(this.store.get('val1'), 1);
      assert.equal(this.store.get('val2'), 4);

      assert.throws(function () {
        this.store.defaults('foo');
      }.bind(this));
    });
  });
});
