/*global describe, before, after, it, beforeEach, afterEach */
'use strict';
var fs = require('fs');
var events = require('events');
var assert = require('assert');
var log = require('yeoman-environment').util.log();
var Conflicter = require('../lib/util/conflicter');
var _ = require('lodash');
var inquirer = require('inquirer');

var fileFoo = {
  file: 'foo.js',
  content: 'var foo = "foo";\n'
};
var fileBar = {
  file: 'boo.js',
  content: 'var boo = "boo";\n'
};

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
    var conflict = this.conflicter.pop();
    assert.deepEqual(conflict.file, __filename);
    assert.deepEqual(conflict.content, fs.readFileSync(__filename, 'utf8'));
  });

  it('#pop()', function () {
    this.conflicter.add(fileFoo);
    this.conflicter.add(fileBar);
    var conflict = this.conflicter.pop();
    assert.deepEqual(conflict.file, 'boo.js');
    assert.deepEqual(conflict.content, 'var boo = "boo";\n');
  });

  it('#shift()', function () {
    this.conflicter.add(fileFoo);
    this.conflicter.add(fileBar);
    var conflict = this.conflicter.shift();
    assert.deepEqual(conflict.file, 'foo.js');
    assert.deepEqual(conflict.content, 'var foo = "foo";\n');
  });

  describe('#resolve()', function () {
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
      this.conflicter.once('resolved:' + __filename, function () {
        conflicts++;
      });

      // not called.
      this.conflicter.once('resolved:foo.js', function () {
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

  describe('#collision()', function () {
    var me = fs.readFileSync(__filename, 'utf8');

    beforeEach(function () {
      var prompt = inquirer.createPromptModule();
      var mockAdapter = {
        prompt: prompt,
        diff: function () {},
        log: log
      };
      var self = this;
      var Prompt = function (q, cb) {
        this.answer = _.where(q.choices, { key: self.answer })[0].value;
      };

      Prompt.prototype.run = function (cb) {
        cb(this.answer);
      };
      prompt.registerPrompt('expand', Prompt);
      this.conflicter = new Conflicter(mockAdapter);
    });

    afterEach(function () {
      delete this.conflicter.force;
    });

    it('identical status', function (done) {
      this.conflicter.collision(__filename, me, function (status) {
        assert.equal(status, 'identical');
        done();
      });
    });

    it('create status', function (done) {
      this.conflicter.collision('file-who-does-not-exist.js', '', function (status) {
        assert.equal(status, 'create');
        done();
      });
    });

    it('user choose "yes"', function (done) {
      this.answer = 'y';
      this.conflicter.collision(__filename, '', function (status) {
        assert.equal(status, 'force');
        done();
      });
    });

    it('user chosse "skip"', function (done) {
      this.answer = 'n';
      this.conflicter.collision(__filename, '', function (status) {
        assert.equal(status, 'skip');
        done();
      });
    });

    it('user choose "all"', function (done) {
      this.answer = 'a';
      this.conflicter.collision(__filename, '', function (status) {
        assert.equal(status, 'force');
        done();
      });
    });

    it('force conflict status', function (done) {
      this.conflicter.force = true;
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
      this.conflicter._ask('/tmp/file', 'my file contents', function () {
        assert(callCount, 1);
        done();
      });
    });

  });
});
