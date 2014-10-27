/*global describe, before, after, it, beforeEach, afterEach */
'use strict';
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var Conflicter = require('../lib/util/conflicter');
var TestAdapter = require('../lib/test/adapter').TestAdapter;
var _ = require('lodash');
var inquirer = require('inquirer');
var sinon = require('sinon');

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
    this.conflicter = new Conflicter(new TestAdapter());
  });

  it('is an event emitter', function () {
    assert.ok(this.conflicter instanceof require('events').EventEmitter);
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
    beforeEach(function () {
      var self = this;
      var mockAdapter = new TestAdapter();

      // TODO: This test must be decouple from the inquirer module. This is very ugly...
      mockAdapter.prompt = inquirer.createPromptModule();
      var Prompt = function (q, cb) {
        this.answer = _.where(q.choices, { key: self.answer })[0].value;
      };
      Prompt.prototype.run = function (cb) {
        cb(this.answer);
      };
      mockAdapter.prompt.registerPrompt('expand', Prompt);

      this.conflicter = new Conflicter(mockAdapter);
    });

    afterEach(function () {
      delete this.conflicter.force;
    });

    it('identical status', function (done) {
      var me = fs.readFileSync(__filename, 'utf8');
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

    it('does not give a conflict on same binary files', function (done) {
      this.conflicter.force = true;
      this.conflicter.collision(
        path.join(__dirname, 'fixtures/yeoman-logo.png'),
        fs.readFileSync(path.join(__dirname, 'fixtures/yeoman-logo.png')),
        function (status) {
          assert.equal(status, 'identical');
          done();
        }.bind(this));
    });
  });

  describe('#diff()', function () {
    beforeEach(function () {
      this.adapter = new TestAdapter();
      this.conflicter = new Conflicter(this.adapter);
    });

    it('Calls adapter diff function', function () {
      this.conflicter.diff('actual', 'expected');
      sinon.assert.calledOnce(this.adapter.diff);
    });
  });

  describe('#_ask()', function () {
    beforeEach(function () {
      this.answer = sinon.spy(function (cb) {
        cb('skip');
      });
      var adapter = new TestAdapter({ overwrite: this.answer });
      this.conflicter = new Conflicter(adapter);
    });

    it('Calls answer related function and pass a callback', function (done) {
      this.conflicter._ask('/tmp/file', 'my file contents', function () {
        sinon.assert.calledOnce(this.answer);
        done();
      }.bind(this));
    });
  });
});
