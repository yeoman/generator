/*global describe, before, beforeEach, it */
'use strict';
var events = require('events');
var Environment = require('yeoman-environment');
var generators = require('../');
var assert = require('yeoman-assert');

describe('Generators module', function () {
  describe('generators.Base', function () {
    beforeEach(function () {
      this.env = Environment.createEnv();
      this.generator = new generators.Base({
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
