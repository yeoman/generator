/*global describe, before, beforeEach, after, afterEach, it */
'use strict';
var assert = require('assert');
var chalk = require('chalk');
var sinon = require('sinon');
var deprecate = require('../lib/util/deprecate');

describe('deprecate()', function () {
  beforeEach(function () {
    sinon.spy(console, 'log');
  });

  afterEach(function () {
    console.log.restore();
  });

  it('log a message', function () {
    var func = sinon.spy();
    var wrapped = deprecate('foo', func);
    sinon.assert.notCalled(console.log);
    wrapped('bar', 2);
    sinon.assert.calledWith(console.log, chalk.yellow('(!) ') + 'foo');
    sinon.assert.calledWith(func, 'bar', 2);
  });

  describe('.object()', function () {
    it('wrap an object and log a message', function () {
      var dummy = {
        foo: 1,
        func: sinon.spy()
      };
      var wrapped = deprecate.object('<%= name %> is deprecated', dummy);

      // Keep values
      assert.equal(wrapped.foo, 1);

      // Wrap methods
      wrapped.func(2);
      sinon.assert.calledWith(dummy.func, 2);
      sinon.assert.calledWith(console.log, chalk.yellow('(!) ') + 'func is deprecated');
    });
  });

  describe('.property()', function () {
    it('wrap a property getter and log a message', function () {
      var dummy = {
        foo: 1
      };
      deprecate.property('foo is deprecated', dummy, 'foo');

      // Keep values
      assert.equal(dummy.foo, 1);

      // Wrap methods
      sinon.assert.calledWith(console.log, chalk.yellow('(!) ') + 'foo is deprecated');
    });
  });
});
