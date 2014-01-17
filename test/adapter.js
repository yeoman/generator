/*global describe, before, beforeEach, afterEach, it */
var TerminalAdapter = require('../lib/env/adapter');
var sinon = require('sinon');
var inquirer = require('inquirer');
var yeoman = require('..');
var assert = yeoman.assert;

describe('TerminalAdapter', function () {
  'use strict';

  beforeEach(function () {
    this.adapter = new TerminalAdapter();
  });

  describe('#prompt()', function () {
    beforeEach(function () {
      this.spy = sinon.spy(inquirer, 'prompt');
    });

    afterEach(function () {
      inquirer.prompt.restore();
    });

    it('pass its arguments to inquirer', function () {
      var questions = [];
      var cb = function () {};
      this.adapter.prompt(questions, cb);
      assert(this.spy.withArgs(questions, cb).calledOnce);
    });
  });

  describe('#diff()', function () {
    it('returns properly colored diffs', function () {
      var diff = this.adapter.diff('var', 'let');
      assert.textEqual(diff, '\n\u001b[41mremoved\u001b[49m \u001b[42m\u001b[30madded\u001b[39m\u001b[49m\n\n\u001b[42m\u001b[30mlet\u001b[39m\u001b[49m\u001b[41mvar\u001b[49m\n');
    });
  });

  describe('#log()', function () {
    beforeEach(function () {
      this.spyerror = sinon.spy(console, 'error');
    });

    afterEach(function () {
      console.error.restore();
    });

    it('calls console.error and perform strings interpolation', function () {
      this.adapter.log('%has %many %reps', {
        has: 'has',
        many: 'many',
        reps: 'reps'
      });
      assert(this.spyerror.withArgs('has many reps').calledOnce);
    });
  });

  describe('#log', function () {

    beforeEach(function () {
      this.spylog = sinon.spy(process.stderr, 'write');
    });

    afterEach(function () {
      process.stderr.write.restore();
    });

    it('#write() pass strings as they are', function () {
      var testString = 'dummy';
      this.adapter.log.write(testString);
      assert(this.spylog.withArgs(testString).calledOnce);
    });

    it('#write() accepts utile#format style arguments', function () {
      this.adapter.log.write('A number: %d, a string: %s', 1, 'bla');
      assert(this.spylog.withArgs('A number: 1, a string: bla').calledOnce);
    });

    it('#writeln() adds a \\n at the end', function () {
      this.adapter.log.writeln('dummy');
      assert(this.spylog.withArgs('dummy').calledOnce);
      assert(this.spylog.withArgs('\n').calledOnce);
    });

    it('#ok() adds a green "✔ " at the beginning and \\n at the end', function () {
      this.adapter.log.ok('dummy');
      assert(this.spylog.withArgs('\u001b[32m✔ \u001b[39mdummy\n').calledOnce);
    });

    it('#error() adds a green "✗ " at the beginning and \\n at the end', function () {
      this.adapter.log.error('dummy');
      assert(this.spylog.withArgs('\u001b[31m✗ \u001b[39mdummy\n').calledOnce);
    });

    describe('statuses', function () {
      it('#skip()');
      it('#force()');
      it('#create()');
      it('#invoke()');
      it('#conflict()');
      it('#identical()');
      it('#info()');
    });
  });
});
