/*global it, describe, before, beforeEach, afterEach */
'use strict';
var util = require('util');
var path = require('path');
var assert = require('assert');
var sinon = require('sinon');
var yo = require('..');
var helpers = yo.test;

var RunContext = require('../lib/test/run-context');

describe('RunContext', function () {

  beforeEach(function () {
    var Dummy = this.Dummy = helpers.createDummyGenerator();
    this.execSpy = sinon.spy();
    Dummy.prototype.exec = this.execSpy;
    this.ctx = new RunContext(Dummy);
  });

  describe('constructor', function () {
    it('accept path parameter', function () {
      var ctx = new RunContext(path.join(__dirname, './fixtures/custom-generator-simple'));
      assert(ctx.env.get('simple:app'));
    });

    it('accept generator constructor parameter (and assign gen:test as namespace)', function () {
      assert(this.ctx.env.get('gen:test'));
    });

    it('run the generator asynchronously', function (done) {
      assert(this.execSpy.notCalled);
      this.ctx.onEnd(function () {
        assert(this.execSpy.calledOnce);
        done();
      }.bind(this));
    });
  });

  describe('#inDir()', function () {
    beforeEach(function () {
      process.chdir(__dirname);
      this.tmp = path.join(__dirname, './temp.dev');
    });

    it('call helpers.testDirectory()', function () {
      sinon.spy(helpers, 'testDirectory');
      this.ctx.inDir(this.tmp);
      assert(helpers.testDirectory.withArgs(this.tmp).calledOnce);
      helpers.testDirectory.restore();
    });

    it('is chainable', function () {
      assert.equal(this.ctx.inDir(this.tmp), this.ctx);
    });
  });

  describe('#withArguments()', function () {
    it('provide arguments to the generator when passed as Array', function (done) {
      this.ctx.withArguments(['one', 'two']);
      this.ctx.onEnd(function () {
        assert.deepEqual(this.execSpy.firstCall.thisValue.arguments, ['one', 'two']);
        done();
      }.bind(this));
    });

    it('provide arguments to the generator when passed as String', function (done) {
      this.ctx.withArguments('foo bar');
      this.ctx.onEnd(function () {
        assert.deepEqual(this.execSpy.firstCall.thisValue.arguments, ['foo', 'bar']);
        done();
      }.bind(this));
    });

    it('is chainable', function () {
      assert.equal(this.ctx.withArguments(''), this.ctx);
    });
  });

  describe('#withOptions()', function () {
    it('provide options to the generator', function (done) {
      this.ctx.withOptions({ foo: 'bar' });
      this.ctx.onEnd(function () {
        assert.equal(this.execSpy.firstCall.thisValue.options.foo, 'bar');
        done();
      }.bind(this));
    });

    it('set skip-install by default', function (done) {
      this.ctx.onEnd(function () {
        assert.equal(this.execSpy.firstCall.thisValue.options['skip-install'], true);
        done();
      }.bind(this));
    });

    it('allow skip-install to be overriden', function (done) {
      this.ctx.withOptions({ 'skip-install': false });
      this.ctx.onEnd(function () {
        assert.equal(this.execSpy.firstCall.thisValue.options['skip-install'], false);
        done();
      }.bind(this));
    });

    it('is chainable', function () {
      assert.equal(this.ctx.withOptions({}), this.ctx);
    });
  });

  describe('#withPrompt()', function () {
    it('mock the prompt', function (done) {
      this.Dummy.prototype.askFor = function () {
        this.prompt({
          name: 'yeoman',
          type: 'input',
          message: 'Hey!'
        }, function (answers) {
          assert.equal(answers.yeoman, 'yes please');
          done();
        });
      };
      this.ctx.withPrompt({ yeoman: 'yes please' });
    });

    it('is chainable', function () {
      assert.equal(this.ctx.withPrompt({}), this.ctx);
    });
  });

  describe('#then()', function () {
    it('is called after the generator ran', function (done) {
      assert(this.execSpy.notCalled);
      this.ctx.onEnd(function () {
        assert(this.execSpy.calledOnce);
        done();
      }.bind(this));
    });

    it('is chainable', function () {
      assert.equal(this.ctx.onEnd(function () {}), this.ctx);
    });
  });
});
