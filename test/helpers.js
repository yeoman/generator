/*global it, describe, before, beforeEach, afterEach */
var util = require('util');
var path = require('path');
var assert = require('assert');
var sinon = require('sinon');
var yeoman = require('..');
var helpers = yeoman.test;
var RunContext = require('../lib/test/run-context');
var env = yeoman();

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

    it('calls default value functions', function (done) {
      var defaultFn = function () {
        return 'bar';
      };
      this.generator.prompt([{ name: 'fromDefaultFn', type: 'input', default: defaultFn }], function (answers) {
        assert.equal(answers.fromDefaultFn, 'bar');
        done();
      });
    });

    it('passes answers object to default value functions', function (done) {
      var defaultFn = function (answers) {
        assert.ok(answers, 'Did not pass answers object to mocked default function');
        return answers.answer + 'bar';
      };
      this.generator.prompt([{ name: 'fromDefaultFn', type: 'input', default: defaultFn }], function (answers) {
        assert.equal(answers.fromDefaultFn, 'foobar');
        done();
      });
    });

    it('uses default values when no answers is passed', function (done) {
      var generator = env.instantiate(helpers.createDummyGenerator());
      helpers.mockPrompt(generator);
      generator.prompt([{ name: 'respuesta', type: 'input', default: 'bar' }], function (answers) {
        assert.equal(answers.respuesta, 'bar');
        done();
      });
    });

    it('prefers mocked values', function (done) {
      this.generator.prompt([{ name: 'answer', type: 'input', default: 'bar' }], function (answers) {
        assert.equal(answers.answer, 'foo');
        done();
      });
    });

    it('works with a single prompt', function (done) {
      this.generator.prompt({ name: 'answer', type: 'input' }, function () {
        done();
      });
    });

    it('can be call multiple time on the same generator', function (done) {
      var generator = env.instantiate(helpers.createDummyGenerator());
      var prompt = generator.prompt;
      helpers.mockPrompt(generator, { foo: 1 });
      helpers.mockPrompt(generator, { foo: 2 });
      assert.equal(generator.origPrompt, prompt, 'origPrompt should point to the initial prompt method');
      generator.prompt({}, function (answers) {
        assert.equal(answers.foo, 2);
        done();
      });
    });

    it('keep prompt method asynchronous', function (done) {
      var val = [];
      this.generator.prompt({ name: 'answer', type: 'input' }, function () {
        val.push(2);
        assert.deepEqual(val, [1, 2]);
        done();
      });
      val.push(1);
    });

    it('does not add errors if validation pass', function (done) {
      helpers.mockPrompt(this.generator, [{ answer1: 'foo' }, { answer2: 'foo' }]);
      this.generator.prompt([{ name: 'answer1', type: 'input' }, { name: 'answer2', type: 'input', validate: { not: 'aFunction' }}], function () {
        assert.ok(this.generator.prompt.errors == null, 'The errors array should not be attached in case of no validation error.');
        done();
      }.bind(this));
    });

    it('validation function returns no validation error', function (done) {
      var validationTrue = function () {
        return true;
      };
      this.generator.prompt({ name: 'answer', type: 'input', validate: validationTrue }, function () {
        assert.ok(this.generator.prompt.errors == null, 'The errors array should not be attached in case of no validation error.');
        done();
      }.bind(this));
    });

    it('validation function returns validation error', function (done) {
      var validationError = function () {
        return 'error message';
      };
      this.generator.prompt({ name: 'answer', type: 'input', validate: validationError }, function () {
        assert.ok(this.generator.prompt.errors != null, 'The errors array should be attached in case of a validation error.');
        assert.equal(this.generator.prompt.errors.length, 1, 'There should be only 1 error attached.');
        assert.equal(this.generator.prompt.errors[0].name, 'answer', 'The error is not for the expected prompt.');
        assert.equal(this.generator.prompt.errors[0].message, 'error message', 'The returned error message is not expected.');
        done();
      }.bind(this));
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

  describe('.run()', function () {
    it('return a RunContext object', function () {
      assert(helpers.run(helpers.createDummyGenerator()) instanceof RunContext);
    });
  });
});
