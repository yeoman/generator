'use strict';
const events = require('events');
const Environment = require('yeoman-environment');
const Base = require('..');
const assert = require('yeoman-assert');

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
      assert.ok(this.generator instanceof events.EventEmitter);
      assert.ok(typeof this.generator.on === 'function');
      assert.ok(typeof this.generator.emit === 'function');
      this.generator.on('yay-o-man', done);
      this.generator.emit('yay-o-man');
    });
  });
});
