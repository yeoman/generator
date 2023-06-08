import EventEmitter from 'node:events';
import path from 'node:path';
import os from 'node:os';
// eslint-disable-next-line n/file-extension-in-import
import { TestAdapter } from '@yeoman/adapter/testing';
import Environment from 'yeoman-environment';
import assert from 'yeoman-assert';
import semver from 'semver';
import Base from './utils.js';

const NAMESPACE = 'somenamespace';
const createEnv = () => new Environment({ skipInstall: true, adapter: new TestAdapter() });

describe('Generators module', () => {
  beforeEach(function () {
    this.env = createEnv();
  });

  describe('Base', () => {
    beforeEach(function () {
      const Generator = class extends Base {};
      Generator.prototype.exec = function () {};
      this.generator = new Generator({
        env: this.env,
        namespace: NAMESPACE,
        resolved: 'test',
      });
    });

    it('should expose yoGeneratorVersion', function () {
      assert(
        semver.valid(this.generator.yoGeneratorVersion),
        `Not valid version ${this.generator.yoGeneratorVersion as string}`,
      );
    });

    it('is an EventEmitter', function (done) {
      assert.ok(this.generator instanceof EventEmitter);
      assert.strictEqual(typeof this.generator.on, 'function');
      assert.strictEqual(typeof this.generator.emit, 'function');
      this.generator.on('yay-o-man', done);
      this.generator.emit('yay-o-man');
    });

    it('emits done event', function (done) {
      this.env.on(`done$${NAMESPACE}#exec`, data => {
        assert(data.generator === this.generator);
        assert(`done$${NAMESPACE}#exec`.includes(data.namespace));
        assert(data.namespace === NAMESPACE);
        assert(data.priorityName === 'default');
        assert(data.queueName === 'default');
        done();
      });
      this.generator.run();
    });
  });

  it('without localConfigOnly option', function () {
    this.generator = new Base({
      env: this.env,
      resolved: 'test',
    });
    assert.equal(path.join(os.homedir(), '.yo-rc-global.json'), this.generator._globalConfig.path);
  });

  it('with localConfigOnly option', function () {
    this.generator = new Base({
      env: this.env,
      resolved: 'test',
      localConfigOnly: true,
    });
    assert.equal(path.join(this.env.cwd, '.yo-rc-global.json'), this.generator._globalConfig.path);
  });

  describe('#run', () => {
    beforeEach(function () {
      const Generator = class extends Base {};
      Generator.prototype.throwing = () => {
        throw new Error('not thrown');
      };

      this.generator = new Generator({
        env: this.env,
        resolved: 'test',
      });
    });

    it('forwards error to environment', function (done) {
      this.env.on('error', () => {
        done();
      });
      this.generator.run();
    });
  });

  describe('#createStorage', () => {
    beforeEach(function () {
      this.generator = new Base({
        env: this.env,
        resolved: 'test',
        localConfigOnly: true,
      });
    });

    it('with path and name', function () {
      const global = path.join(this.env.cwd, '.yo-rc-global.json');
      const customStorage = this.generator.createStorage(global, '*');
      assert.equal(global, customStorage.path);
      assert.equal('*', customStorage.name);
    });

    it('with path', function () {
      const global = path.join(this.env.cwd, '.yo-rc-global.json');
      const customStorage = this.generator.createStorage(global);
      assert.equal(global, customStorage.path);
      assert.equal(undefined, customStorage.name);
    });
  });

  it('running standalone', done => {
    const Generator = class extends Base {};
    try {
      // eslint-disable-next-line no-new
      new Generator();
    } catch (error) {
      assert.equal(error.message, 'This generator requires an environment.');
      done();
    }
  });

  it('running with an empty env', done => {
    const Generator = class extends Base {};
    try {
      // eslint-disable-next-line no-new
      new Generator({ env: {} });
    } catch (error) {
      assert.equal(error.message, "Current environment doesn't provides some necessary feature this generator needs.");
      done();
    }
  });
});
