/*global describe, before, beforeEach, it */
'use strict';
var path = require('path');
var os = require('os');
var events = require('events');
var Environment = require('yeoman-environment');
var generators = require('../');
var assert = require('yeoman-assert');
var helpers = require('yeoman-test');
var tmpdir = path.join(os.tmpdir(), 'yeoman-generators');

describe('Generators module', function () {
  before(helpers.setUpTestDirectory(tmpdir));

  describe('module', function () {
    it('initialize new Environments', function () {
      assert.ok(generators() instanceof Environment);
      assert.notEqual(generators(), generators());
    });

    it('pass arguments to the Environment constructor', function () {
      var args = ['model', 'Post'];
      var opts = { help: true };
      var env = generators(args, opts);
      assert.deepEqual(env.arguments, args);
      assert.deepEqual(env.options, opts);
    });
  });

  describe('generators.Base', function () {
    beforeEach(function () {
      this.env = generators();
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
