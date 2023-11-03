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
    let deprecatedLogSpy: SinonSpy;
    beforeEach(() => {
      deprecatedLogSpy = sinon.fake();
      sinon.replace(deprecate, 'log', deprecatedLogSpy);
    });

    afterEach(() => {
      sinon.restore();
    });

    it('deprecates all functions/methods in the object', () => {
      type SomeOtherObject = SimpleObject & {
        anotherFunction: (someValue: string) => string;
      };
      const originalObject: SomeOtherObject = {
        foo: 1,
        functionInObj(someValue: number): number {
          return someValue - 1;
        },
        anotherFunction(someValue: string): string {
          return `${someValue} and ${someValue}`;
        },
      };

      // TODO When deprecate.js is changed to .ts, DeprecatedObject will be defined in deprecate.ts as something like type DeprecatedObject<O> = O;
      const deprecatedObject = deprecate.object('<%= name %> is deprecated', originalObject);
      // @ts-expect-error  The method functionInObj() does exist on deprecatedObject. This should be a DeprecatedObject<SimpleObject>. When deprecate.js is changed to .ts, this can be implemented and no error will occur here.
      deprecatedObject.functionInObj(42);
      assert.ok(
        deprecatedLogSpy.calledWith('functionInObj is deprecated'),
        `last call with args: ${deprecatedLogSpy.lastCall.args[0]}`,
      );

      // @ts-expect-error  The method anotherFunction() does exist on deprecatedObject. This should be a DeprecatedObject<SimpleObject>. When deprecate.js is changed to .ts, this can be implemented and no error will occur here.
      deprecatedObject.anotherFunction('something');
      assert.ok(
        deprecatedLogSpy.calledWith('anotherFunction is deprecated'),
        `last call with args: ${deprecatedLogSpy.lastCall.args[0]}`,
      );
    });

    it('properties that are not functions are not changed', () => {
      const originalObject: SimpleObject = {
        foo: 1,
        functionInObj(someValue: number): number {
          return someValue - 1;
        },
      };

      const deprecatedObject = deprecate.object('The function "<%= name %>" is deprecated', originalObject);
      // @ts-expect-error  The property foo does exist on deprecatedObject. This should be a DeprecatedObject<SimpleObject>. When deprecate.js is changed to .ts, this can be implemented and no error will occur here.
      const fooValue = deprecatedObject.foo;
      assert.equal(fooValue, 1);
      assert.ok(deprecatedLogSpy.notCalled);
    });

    it('property getters and setters are not changed', () => {
      type ObjectWithGettersSetters = SimpleObject & {
        get bar(): number;
        set bar(someValue: number);
      };

      const originalObject: ObjectWithGettersSetters = {
        foo: 10,
        functionInObj(someValue: number): number {
          return someValue - 1;
        },
        get bar(): number {
          return this.foo * 2;
        },
        set bar(someValue: number) {
          this.foo = someValue / 2;
        },
      };

      const deprecatedObject = deprecate.object('The function "<%= name %>" is deprecated', originalObject);
      // @ts-expect-error The getter bar does exist on the object. This should be a DeprecatedObject<SimpleObject>. When deprecate.js is changed to .ts, this can be implemented and no error will occur here.
      deprecatedObject.bar;
      // @ts-expect-error The setter bar does exist on the object. This should be a DeprecatedObject<SimpleObject>. When deprecate.js is changed to .ts, this can be implemented and no error will occur here.
      deprecatedObject.bar = 7;

      assert.ok(deprecatedLogSpy.notCalled);
    });

    it('deprecation message can be a template', () => {
      const originalObject: SimpleObject = {
        foo: 1,
        functionInObj(someValue: number): number {
          return someValue - 1;
        },
      };

      const deprecatedObject = deprecate.object('The function "<%= name %>" is deprecated', originalObject);

      // @ts-expect-error The method functionInObj() does exist on deprecatedObject. This should be a DeprecatedObject<SimpleObject>. When deprecate.js is changed to .ts, this can be implemented and no error will occur here.
      deprecatedObject.functionInObj(42);

      assert.ok(
        deprecatedLogSpy.calledWith('The function "functionInObj" is deprecated'),
        `last call with args: ${deprecatedLogSpy.lastCall.args[0]}`,
      );
    });
  });

  describe('.property()', () => {
    let deprecatedLogSpy: SinonSpy;
    beforeEach(() => {
      deprecatedLogSpy = sinon.fake();
      sinon.replace(deprecate, 'log', deprecatedLogSpy);
    });

    afterEach(() => {
      sinon.restore();
    });

    it('the deprecated message shows when a property is accessed', () => {
      const originalObject = {
        foo: 1,
      };
      deprecate.property('foo property is deprecated', originalObject, 'foo');

      // Value is not affected; it remains the same
      assert.equal(originalObject.foo, 1);

      assert.ok(
        deprecatedLogSpy.calledWith('foo property is deprecated'),
        `deprecatedLogSpy called with (${deprecatedLogSpy.lastCall.args[0]})`,
      );
    });

    it('property getters and setters are deprecated', () => {
      type ObjectWithGettersSetters = SimpleObject & {
        get bar(): number;
        set bar(someValue: number);
      };

      const originalObject: ObjectWithGettersSetters = {
        foo: 10,
        functionInObj(someValue: number): number {
          return someValue - 1;
        },
        get bar(): number {
          return this.foo * 2;
        },
        set bar(someValue: number) {
          this.foo = someValue / 2;
        },
      };

      deprecate.property('bar is deprecated', originalObject, 'bar');
      originalObject.bar;
      assert.ok(
        deprecatedLogSpy.calledWith('bar is deprecated'),
        `deprecatedLogSpy called with (${deprecatedLogSpy.lastCall.args[0]})`,
      );

      originalObject.bar = 7;
      assert.ok(
        deprecatedLogSpy.calledWith('bar is deprecated'),
        `deprecatedLogSpy called with (${deprecatedLogSpy.lastCall.args[0]})`,
      );
    });
  });
});
