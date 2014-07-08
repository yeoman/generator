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
    var logMessage;
    var stderrWriteBackup = process.stderr.write;

    beforeEach(function () {
      this.spyerror = sinon.spy(console, 'error');

      logMessage = '';
      process.stderr.write = (function (write) {
        return function (str, encoding, fd) {
          logMessage = str;
        };
      }(process.stderr.write));
    });

    afterEach(function () {
      console.error.restore();

      process.stderr.write = stderrWriteBackup;
    });

    it('calls console.error and perform strings interpolation', function () {
      this.adapter.log('%has %many %reps', {
        has: 'has',
        many: 'many',
        reps: 'reps'
      });
      assert(this.spyerror.withArgs('has many reps').calledOnce);
      assert.equal(logMessage, 'has many reps\n');
    });

    it('substitutes strings correctly when context argument is falsey', function () {
      this.adapter.log('Zero = %d, One = %s', 0, 1);

      assert(this.spyerror.calledOnce);
      assert.equal(logMessage, 'Zero = 0, One = 1\n');
    });

    it('boolean values', function () {
      this.adapter.log(true);
      assert(this.spyerror.withArgs(true).calledOnce);
      assert.equal(logMessage, 'true\n');
    });

    it('#write() numbers', function () {
      this.adapter.log(42);
      assert(this.spyerror.withArgs(42).calledOnce);
      assert.equal(logMessage, 42);
    });

    it('#write() objects', function () {
      var outputObject = {
        something: 72,
        another: 12
      };

      this.adapter.log(outputObject);
      assert(this.spyerror.withArgs(outputObject).calledOnce);
      assert.equal(logMessage, '{ something: 72, another: 12 }\n');
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
