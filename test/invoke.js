/*global describe, it, before, after, beforeEach, afterEach */
'use strict';

var yo = require('..');
var helpers = yo.test;
var assert = yo.assert;

describe('Base#invoke()', function () {
  beforeEach(function () {
    this.env = yo();
    this.gen = new (helpers.createDummyGenerator())({
      namespace: 'foo:lab',
      resolved: 'path/',
      env: this.env,
      'skip-install': true
    });
    this.env.registerStub(yo.generators.Base.extend({
      exec: function () { this.stubGenRunned = true; }
    }), 'foo:bar');
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
});
