'use strict';
const EventEmitter = require('events');
const Environment = require('yeoman-environment');
const assert = require('yeoman-assert');
const Base = require('..');

describe('Generators module', () => {
  describe('Base', () => {
    beforeEach(function () {
      this.env = Environment.createEnv();
      this.generator = new Base({
        env: this.env,
        resolved: 'test'
      });
    });

    it('is an EventEmitter', function (done) {
      assert.ok(this.generator instanceof EventEmitter);
      assert.strictEqual(typeof this.generator.on, 'function');
      assert.strictEqual(typeof this.generator.emit, 'function');
      this.generator.on('yay-o-man', done);
      this.generator.emit('yay-o-man');
    });
  });
});
