/*global it, describe, before, beforeEach, afterEach */
var util = require('util');
var path = require('path');
var assert = require('assert');
var sinon = require('sinon');
var yeoman = require('..');
var helpers = yeoman.test;

describe('yeoman.test', function () {
  'use strict';

  beforeEach(function () {
    process.chdir(path.join(__dirname, './fixtures'));
    var self = this;
    this.StubGenerator = function (args, options) {
      self.args = args;
      self.options = options;
    };
    util.inherits(this.StubGenerator, yeoman.Base);
  });

  describe('.createGenerator()', function () {
    it('create a new generator', function () {
      var generator = helpers.createGenerator('unicorn:app', [
        [this.StubGenerator, 'unicorn:app']
      ]);
      assert.ok(generator instanceof this.StubGenerator);
    });

    it('pass args params to the generator', function () {
      helpers.createGenerator('unicorn:app', [
        [this.StubGenerator, 'unicorn:app']
      ], ['temp']);
      assert.deepEqual(this.args, ['temp']);
    });

    it('pass options param to the generator', function () {
      helpers.createGenerator('unicorn:app', [
        [this.StubGenerator, 'unicorn:app']
      ], ['temp'], { ui: 'tdd' });
      assert.equal(this.options.ui, 'tdd');
    });
  });

  describe('.decorate()', function () {
    beforeEach(function () {
      this.spy = sinon.spy();
      this.spyStub = sinon.spy();
      this.execSpy = sinon.spy();
      this.execStubSpy = sinon.spy();
      this.ctx = {
        exec: this.execSpy,
        execStub: this.execStubSpy
      };

      helpers.decorate(this.ctx, 'exec', this.spy);
      helpers.decorate(this.ctx, 'execStub', this.spyStub, { stub: true });
      this.ctx.exec('foo', 'bar');
      this.ctx.execStub();
    });

    it('wraps a method', function () {
      assert(this.spy.calledBefore(this.execSpy));
    });

    it('passes arguments of the original methods', function () {
      assert(this.spy.calledWith('foo', 'bar'));
    });

    it('skip original methods if stub: true', function () {
      assert(this.execStubSpy.notCalled);
    });
  });

  describe('.stub()', function () {
    beforeEach(function () {
      this.spy = sinon.spy();
      this.initialExec = sinon.spy();
      this.ctx = {
        exec: this.initialExec
      };
      helpers.stub(this.ctx, 'exec', this.spy);
    });

    it('replace initial method', function () {
      this.ctx.exec();
      assert(this.initialExec.notCalled);
      assert(this.spy.calledOnce);
    });
  });

  describe('.restore()', function () {
    beforeEach(function () {
      this.initialExec = function () {};
      this.ctx = {
        exec: this.initialExec
      };
      helpers.decorate(this.ctx, 'exec', function () {});
    });

    it('restore decorated methods', function () {
      assert.notEqual(this.ctx.exec, this.initialExec);
      helpers.restore();
      assert.equal(this.ctx.exec, this.initialExec);
    });
  });

  describe('.mockPrompt()', function () {
    beforeEach(function () {
      this.generator = helpers.createDummyGenerator();
      helpers.mockPrompt(this.generator, { answer: 'foo' });
    });

    it('mock a generator prompt', function (done) {
      this.generator.prompt([], function (answers) {
        assert.equal(answers.answer, 'foo');
        done();
      });
    });

    it('uses default values', function (done) {
      this.generator.prompt([{ name: 'respuesta', type: 'input', default: 'bar' }], function (answers) {
        assert.equal(answers.respuesta, 'bar');
        done();
      });
    });

    it('prefers mocked values', function (done) {
      this.generator.prompt([{ name: 'answser', type: 'input', default: 'bar' }], function (answers) {
        assert.equal(answers.answer, 'foo');
        done();
      });
    });

    it('works with a single prompt', function (done) {
      this.generator.prompt({ name: 'answser', type: 'input' }, function () {
        done();
      });
    });
  });

  describe('.before()', function () {
    afterEach(function () {
      helpers.restore();
    });

    it('alias .setUpTestDirectory()', function (done) {
      helpers.stub(helpers, 'setUpTestDirectory', function (dir) {
        assert.equal(dir, 'dir');
        done();
      });
      helpers.before('dir');
    });
  });
});
