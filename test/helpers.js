/*global it, describe, before, beforeEach, afterEach */
'use strict';
var util = require('util');
var path = require('path');
var assert = require('assert');
var sinon = require('sinon');
var yeoman = require('..');
var helpers = yeoman.test;
var RunContext = require('../lib/test/run-context');
var env = yeoman();

describe('yeoman.test', function () {
  beforeEach(function () {
    process.chdir(path.join(__dirname, './fixtures'));
    var self = this;
    this.StubGenerator = function (args, options) {
      self.args = args;
      self.options = options;
    };
    util.inherits(this.StubGenerator, yeoman.Base);
  });

  describe('.registerDependencies()', function () {
    it('accepts dependency as a path', function () {
      helpers.registerDependencies(env, ['./custom-generator-simple']);
      assert(env.get('simple:app'));
    });

    it('accepts dependency as array of [<generator>, <name>]', function () {
      helpers.registerDependencies(env, [[this.StubGenerator, 'stub:app']]);
      assert(env.get('stub:app'));
    });
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
      this.spy = sinon.stub().returns(1);
      this.spyStub = sinon.stub().returns(2);
      this.execSpy = sinon.stub().returns(3);
      this.execStubSpy = sinon.stub().returns(4);
      this.ctx = {
        exec: this.execSpy,
        execStub: this.execStubSpy
      };

      helpers.decorate(this.ctx, 'exec', this.spy);
      helpers.decorate(this.ctx, 'execStub', this.spyStub, { stub: true });
      this.execResult = this.ctx.exec('foo', 'bar');
      this.execStubResult = this.ctx.execStub();
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

    it('returns original methods if stub: false', function () {
      assert.equal(this.execResult, 3);
    });

    it('returns stub methods if stub: true', function () {
      assert.equal(this.execStubResult, 2);
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
      this.generator = env.instantiate(helpers.createDummyGenerator());
      helpers.mockPrompt(this.generator, { answer: 'foo' });
    });

    it('uses default values', function (done) {
      this.generator.prompt([{ name: 'respuesta', type: 'input', default: 'bar' }], function (answers) {
        assert.equal(answers.respuesta, 'bar');
        done();
      });
    });

    it('uses default values when no answer is passed', function (done) {
      var generator = env.instantiate(helpers.createDummyGenerator());
      helpers.mockPrompt(generator);
      generator.prompt([{ name: 'respuesta', message: 'foo', type: 'input', default: 'bar' }], function (answers) {
        assert.equal(answers.respuesta, 'bar');
        done();
      });
    });

    it('prefers mocked values over defaults', function (done) {
      this.generator.prompt([{ name: 'answer', type: 'input', default: 'bar' }], function (answers) {
        assert.equal(answers.answer, 'foo');
        done();
      });
    });

    it('can be call multiple time on the same generator', function (done) {
      var generator = env.instantiate(helpers.createDummyGenerator());
      helpers.mockPrompt(generator, { foo: 1 });
      helpers.mockPrompt(generator, { foo: 2 });
      generator.prompt({ message: 'bar', name: 'foo' }, function (answers) {
        assert.equal(answers.foo, 2);
        done();
      });
    });

    it('keep prompt method asynchronous', function (done) {
      var spy = sinon.spy();
      this.generator.prompt({ name: 'answer', type: 'input' }, function () {
        sinon.assert.called(spy);
        done();
      });
      spy();
    });
  });

  describe('.before()', function () {
    afterEach(function () {
      helpers.restore();
    });

    it('alias .setUpTestDirectory()', function () {
      var spy = sinon.spy(helpers, 'setUpTestDirectory');
      helpers.before('dir');
      sinon.assert.calledWith(spy, 'dir');
    });
  });

  describe('.run()', function () {
    it('return a RunContext object', function () {
      assert(helpers.run(helpers.createDummyGenerator()) instanceof RunContext);
    });
  });
});
