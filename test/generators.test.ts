/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import EventEmitter from 'node:events';
import path from 'node:path';
import os from 'node:os';
import { beforeEach, describe, expect, it, vitest } from 'vitest';
import { TestAdapter } from '@yeoman/adapter/testing';
import Environment from 'yeoman-environment';
import { valid as semverValid } from 'semver';
import Base from './utils.js';

const NAMESPACE = 'somenamespace';
const createEnv = () => new Environment({ skipInstall: true, adapter: new TestAdapter() });

describe('Generators module', () => {
  let generator: Base;
  let env: Environment;

  beforeEach(() => {
    env = createEnv();
  });

  describe('Base', () => {
    beforeEach(() => {
      const Generator = class extends Base {};
      Generator.prototype.exec = function () {};
      generator = new Generator({
        env: env,
        namespace: NAMESPACE,
        resolved: 'test',
      });
    });

    it('should expose yoGeneratorVersion', () => {
      expect(semverValid(generator.yoGeneratorVersion)).toBeTruthy();
    });

    it('is an EventEmitter', () =>
      new Promise<void>(done => {
        expect(generator instanceof EventEmitter).toBeTruthy();
        expect(typeof generator.on).toBe('function');
        expect(typeof generator.emit).toBe('function');
        generator.on('yay-o-man', done);
        generator.emit('yay-o-man');
      }));

    it('emits done event', () =>
      new Promise<void>(done => {
        env.on(`done$${NAMESPACE}#exec`, data => {
          expect(data.generator === generator).toBeTruthy();
          expect(`done$${NAMESPACE}#exec`.includes(data.namespace)).toBeTruthy();
          expect(data.namespace === NAMESPACE).toBeTruthy();
          expect(data.priorityName === 'default').toBeTruthy();
          expect(data.queueName === 'default').toBeTruthy();
          done();
        });
        generator.run().catch(() => {});
      }));
  });

  it('without localConfigOnly option', () => {
    generator = new Base({
      env: env,
      resolved: 'test',
    });
    expect(generator._globalConfig.path).toBe(path.join(os.homedir(), '.yo-rc-global.json'));
  });

  it('with localConfigOnly option', () => {
    generator = new Base({
      env: env,
      resolved: 'test',
      localConfigOnly: true,
    });
    expect(generator._globalConfig.path).toBe(path.join(env.cwd, '.yo-rc-global.json'));
  });

  describe('#run', () => {
    beforeEach(() => {
      const Generator = class extends Base {};
      Generator.prototype.throwing = () => {
        throw new Error('not thrown');
      };

      generator = new Generator({
        env: env,
        resolved: 'test',
      });
    });

    it('forwards error to environment', () =>
      new Promise<void>(done => {
        env.on('error', () => {
          done();
        });
        generator.run().catch(() => {});
      }));
  });

  describe('#createStorage', () => {
    beforeEach(() => {
      generator = new Base({
        env: env,
        resolved: 'test',
        localConfigOnly: true,
      });
    });

    it('with path and name', () => {
      const global = path.join(env.cwd, '.yo-rc-global.json');
      const customStorage = generator.createStorage(global, '*');
      expect(global).toBe(customStorage.path);
      expect('*').toBe(customStorage.name);
    });

    it('with path', () => {
      const global = path.join(env.cwd, '.yo-rc-global.json');
      const customStorage = generator.createStorage(global);
      expect(global).toBe(customStorage.path);
      expect(customStorage.name).toBeUndefined();
    });
  });

  describe('#getContextData', () => {
    beforeEach(() => {
      generator = new Base({
        env: env,
        resolved: 'test',
        localConfigOnly: true,
      });
    });

    it('non existing key should throw', () => {
      expect(() => generator.getContextData('foo')).toThrow('Context data foo not found and no factory provided');
    });

    it('non existing key should use factory if provided', () => {
      const data = 'bar';
      const factory: () => string = vitest.fn().mockReturnValue(data);
      expect(generator.getContextData('foo', { factory })).toBe(data);
      expect(factory).toHaveBeenCalled();
    });

    it('retrieves the data', () => {
      const data = 'bar';
      generator._contextMap.set('foo', data);
      expect(generator.getContextData('foo')).toBe(data);
    });

    it('supports custon context', () => {
      const context = 'ctx';
      const key = 'foo';
      const data = 'bar';
      const factory: () => string = vitest.fn().mockReturnValue(data);
      expect(generator.getContextData({ context, key }, { factory })).toBe(data);
      expect(factory).toHaveBeenCalled();
      expect(env.getContextMap(context).get(key)).toBe(data);
    });

    it('using replacement option sets new data and retrieves old data', () => {
      const key = 'foo';
      const data = 'bar';
      expect(generator.getContextData(key, { replacement: data })).toBe(undefined);
      expect(generator.getContextData(key, { replacement: 'new' })).toBe(data);
    });

    it('supports replacement option with custon context', () => {
      const context = 'ctx';
      const key = 'foo';
      const data = 'bar';
      expect(generator.getContextData({ context, key }, { replacement: data })).toBe(undefined);
      expect(generator.getContextData({ context, key }, { replacement: 'new' })).toBe(data);
      expect(env.getContextMap(context).get(key)).toBe('new');
    });
  });

  it('running standalone', () =>
    new Promise<void>(done => {
      const Generator = class extends Base {};
      try {
        new Generator();
      } catch (error) {
        expect((error as Error).message).toBe('This generator requires an environment.');
        done();
      }
    }));

  it('running with an empty env', () =>
    new Promise<void>(done => {
      const Generator = class extends Base {};
      try {
        new Generator({ env: {} as any });
      } catch (error) {
        expect((error as Error).message).toBe(
          "Current environment doesn't provides some necessary feature this generator needs.",
        );
        done();
      }
    }));

  describe('configTransform', () => {
    describe('with args', () => {
      beforeEach(() => {
        generator = new Base(
          [],
          {
            env: env,
            resolved: 'test',
            localConfigOnly: true,
          },
          {
            configTransform: config => ({ transformed: config }),
          },
        );
        generator.config.set('foo', 'bar');
      });

      it('with path', () => {
        expect(generator.config.getAll()).toEqual({ transformed: { foo: 'bar' } });
      });
    });

    describe('without args', () => {
      beforeEach(() => {
        generator = new Base(
          {
            env: env,
            resolved: 'test',
            localConfigOnly: true,
          },
          {
            configTransform: config => ({ transformed: config }),
          },
        );
        generator.config.set('foo', 'bar');
      });

      it('with path', () => {
        expect(generator.config.getAll()).toEqual({ transformed: { foo: 'bar' } });
      });
    });
  });
});
