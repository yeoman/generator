'use strict';
const assert = require('assert');
const chalk = require('chalk');
const sinon = require('sinon');
const deprecate = require('../lib/util/deprecate');

describe('deprecate()', () => {
  beforeEach(() => {
    sinon.spy(console, 'log');
  });

  afterEach(() => {
    console.log.restore();
  });

  it('log a message', () => {
    const func = sinon.spy();
    const wrapped = deprecate('foo', func);
    sinon.assert.notCalled(console.log);
    wrapped('bar', 2);
    sinon.assert.calledWith(console.log, chalk.yellow('(!) ') + 'foo');
    sinon.assert.calledWith(func, 'bar', 2);
  });

  describe('.object()', () => {
    it('wrap an object and log a message', () => {
      const dummy = {
        foo: 1,
        func: sinon.spy()
      };
      const wrapped = deprecate.object('<%= name %> is deprecated', dummy);

      // Keep values
      assert.equal(wrapped.foo, 1);

      // Wrap methods
      wrapped.func(2);
      sinon.assert.calledWith(dummy.func, 2);
      sinon.assert.calledWith(console.log, chalk.yellow('(!) ') + 'func is deprecated');
    });
  });

  describe('.property()', () => {
    it('wrap a property getter and log a message', () => {
      const dummy = {
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
