/*global describe, it, before, after, beforeEach, afterEach */
'use strict';
var yeoman = require('yeoman-environment');
var TestAdapter = require('../lib/test/adapter').TestAdapter;
var generators = require('../');
var helpers = generators.test;
var assert = generators.assert;

describe('generators.Base#invoke()', function () {
  beforeEach(function () {
    this.env = yeoman.createEnv([], {}, new TestAdapter());
    this.Generator = helpers.createDummyGenerator();
    this.gen = new this.Generator({
      namespace: 'foo:lab',
      resolved: 'path/',
      env: this.env,
      'skip-install': true
    });

    this.SubGen = generators.Base.extend({
      exec: function () { this.stubGenRan = true; }
    });

    this.env.registerStub(this.SubGen, 'foo:bar');
  });

  it('invoke available generators', function (done) {
    var invoked = this.gen.invoke('foo:bar', {
      options: { 'skip-install': true }
    });

    invoked.on('end', function () {
      assert(invoked.stubGenRan);
      done();
    });
  });

  it('accept a callback argument', function (done) {
    var invoked = this.gen.invoke('foo:bar', {
      options: { 'skip-install': true }
    }, function () {
      assert(invoked.stubGenRan);
      done();
    });
  });

  it('works when invoked from runLoop', function (done) {
    var stubGenFinished = false;
    var running = 0;
    var asyncFunc = function () {
      var cb = this.async();
      running++;
      setTimeout(function () {
        assert.equal(running, 1);
        running--;
        cb();
      }, 5);
    };

    this.SubGen.prototype.asyncFunc = asyncFunc;
    this.gen.constructor.prototype.asyncFunc = asyncFunc;
    this.gen.constructor.prototype.initializing = function () {
      var cb = this.async();
      var invoked = this.invoke('foo:bar', {
        options: { 'skip-install': true }
      }, function () {
        stubGenFinished = true;
        assert(invoked.stubGenRan, 'Stub generator should have ran');
        cb();
      });
    };

    this.gen.run(function () {
      assert(stubGenFinished, 'invoke callback should have been called');
      done();
    });
  });
});
