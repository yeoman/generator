'use strict';
const EventEmitter = require('events');
const Environment = require('yeoman-environment');
const assert = require('yeoman-assert');
const path = require('path');
const os = require('os');

const Base = require('..');

const NAMESPACE = 'somenamespace';

describe('Generators module', () => {
  beforeEach(function() {
    this.env = Environment.createEnv();
  });

  describe('Base', () => {
    beforeEach(function() {
      const Generator = class extends Base {};
      Generator.prototype.exec = function() {};
      this.generator = new Generator({
        env: this.env,
        namespace: NAMESPACE,
        resolved: 'test'
      });
    });

    it('is an EventEmitter', function(done) {
      assert.ok(this.generator instanceof EventEmitter);
      assert.strictEqual(typeof this.generator.on, 'function');
      assert.strictEqual(typeof this.generator.emit, 'function');
      this.generator.on('yay-o-man', done);
      this.generator.emit('yay-o-man');
    });

    it('emits done event', function(done) {
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

  it('without localConfigOnly option', function() {
    this.generator = new Base({
      env: this.env,
      resolved: 'test'
    });
    assert.equal(
      path.join(os.homedir(), '.yo-rc-global.json'),
      this.generator._globalConfig.path
    );
  });

  it('with localConfigOnly option', function() {
    this.generator = new Base({
      env: this.env,
      resolved: 'test',
      localConfigOnly: true
    });
    assert.equal(
      path.join(this.env.cwd, '.yo-rc-global.json'),
      this.generator._globalConfig.path
    );
  });

  describe('#createStorage', function() {
    before(function() {
      this.generator = new Base({
        env: this.env,
        resolved: 'test',
        localConfigOnly: true
      });
    });

    it('with path and name', function() {
      const global = path.join(this.env.cwd, '.yo-rc-global.json');
      const customStorage = this.generator.createStorage(global, '*');
      assert.equal(global, customStorage.path);
      assert.equal('*', customStorage.name);
    });

    it('with path', function() {
      const global = path.join(this.env.cwd, '.yo-rc-global.json');
      const customStorage = this.generator.createStorage(global);
      assert.equal(global, customStorage.path);
      assert.equal(undefined, customStorage.name);
    });
  });
});
