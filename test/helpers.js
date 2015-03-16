/*global it, describe, before, beforeEach, afterEach */
'use strict';
var util = require('util');
var path = require('path');
var assert = require('assert');
var sinon = require('sinon');
var RunContext = require('../lib/test/run-context');
var yeoman = require('../');
var helpers = yeoman.test;
var env = yeoman();

describe('generators.test', function () {
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

    it('supports `null` answer for `list` type', function (done) {
      var generator = env.instantiate(helpers.createDummyGenerator());
      helpers.mockPrompt(generator, {
        respuesta: null
      });
      generator.prompt([{ name: 'respuesta', message: 'foo', type: 'list', default: 'bar' }], function (answers) {
        assert.equal(answers.respuesta, null);
        done();
      });
    });

    it('treats `null` as no answer for `input` type', function (done) {
      var generator = env.instantiate(helpers.createDummyGenerator());
      helpers.mockPrompt(generator, {
        respuesta: null
      });
      generator.prompt([{ name: 'respuesta', message: 'foo', type: 'input', default: 'bar' }], function (answers) {
        assert.equal(answers.respuesta, 'bar');
        done();
      });
    });

    it('uses `true` as the default value for `confirm` type', function (done) {
      var generator = env.instantiate(helpers.createDummyGenerator());
      helpers.mockPrompt(generator, {});
      generator.prompt([{ name: 'respuesta', message: 'foo', type: 'confirm' }], function (answers) {
        assert.equal(answers.respuesta, true);
        done();
      });
    });

    it('supports `false` answer for `confirm` type', function (done) {
      var generator = env.instantiate(helpers.createDummyGenerator());
      helpers.mockPrompt(generator, { respuesta: false });
      generator.prompt([{ name: 'respuesta', message: 'foo', type: 'confirm' }], function (answers) {
        assert.equal(answers.respuesta, false);
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

  describe('.run()', function () {
    it('return a RunContext object', function () {
      assert(helpers.run(helpers.createDummyGenerator()) instanceof RunContext);
    });

    it('pass settings to RunContext', function () {
      var runContext = helpers.run(helpers.createDummyGenerator(), { foo: 1 });
      assert.equal(runContext.settings.foo, 1);
    });
  });
});
