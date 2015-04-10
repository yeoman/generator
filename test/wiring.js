/*global describe, before, it */
'use strict';
var assert = require('yeoman-assert');
var yeoman = require('yeoman-environment');
var wiring = require('html-wiring');
var helpers = require('..').test;

describe('generators.Base (wiring)', function () {
  it('exposes the wiring interface', function () {
    var Dummy = helpers.createDummyGenerator();
    var dummy = new Dummy([], {
      resolved: 'foo',
      namespace: 'bar',
      env: yeoman.createEnv()
    });

    assert.implement(dummy, wiring);
  });
});
