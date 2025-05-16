import EventEmitter from 'node:events';
import path from 'node:path';
import os from 'node:os';
import { beforeEach, describe, expect, it, vitest } from 'vitest';
import { TestAdapter } from '@yeoman/adapter/testing';
import Environment from 'yeoman-environment';
import assert from 'yeoman-assert';
import { valid as semverValid } from 'semver';
import Base from './utils.js';

const NAMESPACE = 'somenamespace';
const createEnv = () => new Environment({ skipInstall: true, adapter: new TestAdapter() });

describe('Generators module', () => {
  let generator: Generator;
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
      assert(semverValid(generator.yoGeneratorVersion), `Not valid version ${generator.yoGeneratorVersion as string}`);
    });

    it('is an EventEmitter', () =>
      new Promise(done => {
        assert.ok(generator instanceof EventEmitter);
        assert.strictEqual(typeof generator.on, 'function');
        assert.strictEqual(typeof generator.emit, 'function');
        generator.on('yay-o-man', done);
        generator.emit('yay-o-man');
      }));

    it('emits done event', () =>
      new Promise(done => {
        env.on(`done$${NAMESPACE}#exec`, data => {
          assert(data.generator === generator);
          assert(`done$${NAMESPACE}#exec`.includes(data.namespace));
          assert(data.namespace === NAMESPACE);
          assert(data.priorityName === 'default');
          assert(data.queueName === 'default');
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
    assert.equal(path.join(os.homedir(), '.yo-rc-global.json'), generator._globalConfig.path);
  });

  it('with localConfigOnly option', () => {
    generator = new Base({
      env: env,
      resolved: 'test',
      localConfigOnly: true,
    });
    assert.equal(path.join(env.cwd, '.yo-rc-global.json'), generator._globalConfig.path);
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
      new Promise(done => {
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
      assert.equal(global, customStorage.path);
      assert.equal('*', customStorage.name);
    });

    it('with path', () => {
      const global = path.join(env.cwd, '.yo-rc-global.json');
      const customStorage = generator.createStorage(global);
      assert.equal(global, customStorage.path);
      assert.equal(undefined, customStorage.name);
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

    it('using overrides option sets new data and retrieves old data', () => {
      const key = 'foo';
      const data = 'bar';
      expect(generator.getContextData(key, { override: data })).toBe(undefined);
      expect(generator.getContextData(key, { override: 'new' })).toBe(data);
    });

    it('supports overrides option with custon context', () => {
      const context = 'ctx';
      const key = 'foo';
      const data = 'bar';
      expect(generator.getContextData({ context, key }, { override: data })).toBe(undefined);
      expect(generator.getContextData({ context, key }, { override: 'new' })).toBe(data);
      expect(env.getContextMap(context).get(key)).toBe('new');
    });
  });

  it('running standalone', () =>
    new Promise(done => {
      const Generator = class extends Base {};
      try {
        new Generator();
      } catch (error) {
        assert.equal(error.message, 'This generator requires an environment.');
        done();
      }
    }));

  it('running with an empty env', () =>
    new Promise(done => {
      const Generator = class extends Base {};
      try {
        new Generator({ env: {} });
      } catch (error) {
        assert.equal(
          error.message,
          "Current environment doesn't provides some necessary feature this generator needs.",
        );
        done();
      }
    }));
});
