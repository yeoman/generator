/* eslint-disable import/no-named-as-default-member */
import assert from 'node:assert';
import chalk from 'chalk';
import sinon, { type SinonSpy } from 'sinon';
import deprecate from '../src/util/deprecate.js';

type SimpleObject = {
  foo: number;
  functionInObj: (someValue: number) => number;
};

describe('deprecate()', () => {
  let fakeConsoleLog: SinonSpy;
  beforeEach(() => {
    fakeConsoleLog = sinon.fake();
    sinon.replace(console, 'log', fakeConsoleLog);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('deprecate a function', () => {
    let deprecatedLogSpy: SinonSpy;
    beforeEach(() => {
      deprecatedLogSpy = sinon.fake();
      sinon.replace(deprecate, 'log', deprecatedLogSpy);
    });

    afterEach(() => {
      sinon.restore();
    });

    it('the original function is still called', () => {
      const originalFunction = sinon.spy();
      const deprecatedFunction = deprecate('this is function deprecated', originalFunction);

      deprecatedFunction('baz', 3);
      assert.ok(
        originalFunction.calledWith('baz', 3),
        `original function called with (${originalFunction.lastCall.args[0]}, ${originalFunction.lastCall.args[1]})`,
      );
    });

    it('a call to deprecate.log(msg) is added', () => {
      const originalFunction = sinon.spy();
      const deprecatedFunction = deprecate('this is function deprecated', originalFunction);

      originalFunction('bar', 2);
      assert.ok(originalFunction.calledWith('bar', 2), 'original function not called with ("bar", 2)');
      assert.ok(deprecatedLogSpy.notCalled);

      deprecatedFunction('baz', 3);
      assert.ok(deprecatedLogSpy.calledWith('this is function deprecated'));
    });
  });

  describe('.log', () => {
    it('logs the message in yellow, starting with "(!) "', () => {
      deprecate.log('this is the message');
      assert.ok(fakeConsoleLog.calledWith(chalk.yellow('(!) ') + 'this is the message'));
    });
  });

  describe('.object()', () => {
    it('wrap an object and log a message', () => {
      const dummy = {
        foo: 1,
        func: sinon.spy(),
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
        foo: 1,
      };
      deprecate.property('foo is deprecated', dummy, 'foo');

      // Keep values
      assert.equal(dummy.foo, 1);

      // Wrap methods
      sinon.assert.calledWith(console.log, chalk.yellow('(!) ') + 'foo is deprecated');
    });
  });
});
