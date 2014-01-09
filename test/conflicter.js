/*global describe, before, after, it, beforeEach, afterEach */
'use strict';
var fs = require('fs');
var events = require('events');
var assert = require('assert');
var proxyquire = require('proxyquire');
var Conflicter = require('../lib/util/conflicter');
var log = require('../lib/util/log')();

describe('Conflicter', function () {
  beforeEach(function () {
    var mockAdapter = {
      prompt: function () {},
      diff: function () {},
      log: log
    };
    this.conflicter = new Conflicter(mockAdapter);
  });

  it('is an event emitter', function () {
    assert.ok(this.conflicter instanceof events.EventEmitter);
  });

  it('#add()', function () {
    this.conflicter.add(__filename);
    var conflict = this.conflicter.conflicts.pop();
    assert.deepEqual(conflict.file, __filename);
    assert.deepEqual(conflict.content, fs.readFileSync(__filename, 'utf8'));
  });

  describe('#resolve()', function (done) {
    it('wihout conflict', function (done) {
      this.conflicter.resolve(done);
    });

    it('with at least one, without async callback handling', function (done) {
      var conflicts = 0;
      var callbackExecuted = false;

      this.conflicter.add(__filename);
      this.conflicter.add({
        file: 'foo.js',
        content: 'var foo = "foo";\n'
      });

      // called.
      this.conflicter.once('resolved:' + __filename, function (config) {
        conflicts++;
      });

      // not called.
      this.conflicter.once('resolved:foo.js', function (config) {
        conflicts++;
      });

      this.conflicter.resolve(function () {
        callbackExecuted = true;
      });

      assert(conflicts, 1);
      assert(!callbackExecuted);
      done();
    });

    it('with at least one, with async callback handling', function (done) {
      var called = 0;

      this.conflicter.add(__filename);
      this.conflicter.add({
        file: 'foo.js',
        content: 'var foo = "foo";\n'
      });

      this.conflicter.once('resolved:' + __filename, function (config) {
        called++;
        config.callback();
      });

      this.conflicter.once('resolved:foo.js', function (config) {
        called++;
        config.callback();
      });

      this.conflicter.resolve(function () {
        assert(called, 2);
        done();
      });
    });
  });

  describe.skip('#collision()', function (done) {
    var me = fs.readFileSync(__filename, 'utf8');
    it('identical status', function (done) {
      this.conflicter.collision(__filename, me, function (status) {
        assert.equal(status, 'identical');
        done();
      });
    });

    it('create status', function (done) {
      this.conflicter.collision('foo.js', '', function (status) {
        assert.equal(status, 'create');
        done();
      });
    });

    it('conflict status', function (done) {
      this.conflicter.collision(__filename, '', function (status) {
        assert.equal(status, 'force');
        done();
      });
    });
  });

  describe('#diff()', function () {

    beforeEach(function () {
      this.oldConflicter = this.conflicter;
      this.adapterMock = {
        diff: null,
        log: function () {}
      };
      this.conflicter = new Conflicter(this.adapterMock);
    });

    afterEach(function () {
      this.conflicter = this.oldConflicter;
    });

    it('Calls adapter diff function', function () {
      var callCount = 0;
      this.adapterMock.diff = function () {
        callCount++;
      };
      this.conflicter.diff('actual', 'expected');
      assert(callCount, 1);
    });

  });

  describe('#_ask()', function () {

    beforeEach(function () {
      this.oldConflicter = this.conflicter;
      this.adapterMock = {
        prompt: function (config, cb) {
          cb({
            overwrite: this.answer
          });
        },
        err: null,
        answer: null
      };
      this.conflicter = new Conflicter(this.adapterMock);
    });

    afterEach(function () {
      this.conflicter = this.oldConflicter;
    });

    it('Calls answer related function and pass a callback', function (done) {
      var callCount = 0;
      this.adapterMock.answer = function (cb) {
        callCount++;
        cb();
      };
      this.conflicter._ask('/tmp/file', 'my file contents', function (result) {
        assert(callCount, 1);
        done();
      });
    });

  });
});
