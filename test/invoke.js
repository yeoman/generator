/*global describe, it, before, after, beforeEach, afterEach */
'use strict';
var yo = require('..');
var helpers = yo.test;
var assert = yo.assert;

describe('Base#invoke()', function () {
  beforeEach(function () {
    this.env = yo();
    this.Generator = helpers.createDummyGenerator();
    this.gen = new this.Generator({
      namespace: 'foo:lab',
      resolved: 'path/',
      env: this.env,
      'skip-install': true
    });
    this.SubGen = yo.generators.Base.extend({
      exec: function () { this.stubGenRunned = true; }
    });
    this.env.registerStub(this.SubGen, 'foo:bar');
  });

  it('invoke available generators', function (done) {
    var invoked = this.gen.invoke('foo:bar', {
      options: { 'skip-install': true }
    });
    invoked.on('end', function () {
      assert(invoked.stubGenRunned);
      done();
    });
  });

  it('accept a callback argument', function (done) {
    var invoked = this.gen.invoke('foo:bar', {
      options: { 'skip-install': true }
    }, function () {
      assert(invoked.stubGenRunned);
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
        assert(invoked.stubGenRunned, 'Stub generator should have runned');
        cb();
      });
    };

    this.gen.run(function () {
      assert(stubGenFinished, 'invoke callback should have been called');
      done();
    });
  });
});
