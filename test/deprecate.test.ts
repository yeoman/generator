/* eslint-disable @typescript-eslint/no-unused-expressions */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import chalk from 'chalk';
import deprecate from '../src/util/deprecate.js';

type SimpleObject = {
  foo: number;
  functionInObj: (someValue: number) => number;
};

describe('deprecate()', () => {
  let fakeConsoleLog: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    fakeConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('deprecate a function', () => {
    let deprecatedLogSpy: ReturnType<typeof vi.spyOn>;
    beforeEach(() => {
      deprecatedLogSpy = vi.spyOn(deprecate, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('the original function is still called', () => {
      const originalFunction = vi.fn();
      const deprecatedFunction = deprecate('this is function deprecated', originalFunction);

      deprecatedFunction('baz', 3);
      expect(originalFunction).toHaveBeenCalledWith('baz', 3);
    });

    it('a call to deprecate.log(msg) is added', () => {
      const originalFunction = vi.fn();
      const deprecatedFunction = deprecate('this is function deprecated', originalFunction);

      originalFunction('bar', 2);
      expect(originalFunction).toHaveBeenCalledWith('bar', 2);
      expect(deprecatedLogSpy).not.toHaveBeenCalled();

      deprecatedFunction('baz', 3);
      expect(deprecatedLogSpy).toHaveBeenCalledWith('this is function deprecated');
    });
  });

  describe('.log', () => {
    it('logs the message in yellow, starting with "(!) "', () => {
      deprecate.log('this is the message');
      expect(fakeConsoleLog).toHaveBeenCalledWith(`${chalk.yellow('(!) ')}this is the message`);
    });
  });

  describe('.object()', () => {
    let deprecatedLogSpy: ReturnType<typeof vi.spyOn>;
    beforeEach(() => {
      deprecatedLogSpy = vi.spyOn(deprecate, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
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
      expect(deprecatedLogSpy).toHaveBeenCalledWith('functionInObj is deprecated');

      // @ts-expect-error  The method anotherFunction() does exist on deprecatedObject. This should be a DeprecatedObject<SimpleObject>. When deprecate.js is changed to .ts, this can be implemented and no error will occur here.
      deprecatedObject.anotherFunction('something');
      expect(deprecatedLogSpy).toHaveBeenCalledWith('anotherFunction is deprecated');
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
      expect(fooValue).toBe(1);
      expect(deprecatedLogSpy).not.toHaveBeenCalled();
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

      expect(deprecatedLogSpy).not.toHaveBeenCalled();
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

      expect(deprecatedLogSpy).toHaveBeenCalledWith('The function "functionInObj" is deprecated');
    });
  });

  describe('.property()', () => {
    let deprecatedLogSpy: ReturnType<typeof vi.spyOn>;
    beforeEach(() => {
      deprecatedLogSpy = vi.spyOn(deprecate, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('the deprecated message shows when a property is accessed', () => {
      const originalObject = {
        foo: 1,
      };
      deprecate.property('foo property is deprecated', originalObject, 'foo');

      // Value is not affected; it remains the same
      expect(originalObject.foo).toBe(1);

      expect(deprecatedLogSpy).toHaveBeenCalledWith('foo property is deprecated');
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
      expect(deprecatedLogSpy).toHaveBeenCalledWith('bar is deprecated');

      originalObject.bar = 7;
      expect(deprecatedLogSpy).toHaveBeenCalledWith('bar is deprecated');
    });
  });
});
