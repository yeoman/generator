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
    sinon.restore();
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
