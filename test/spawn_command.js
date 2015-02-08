'use strict';

var assert = require('assert');
var proxyquire = require('proxyquire');
var sinon = require('sinon');

describe('#spawnCommand()', function () {
  beforeEach(function () {
    this.crossSpawn = sinon.spy();
    this.spawn = proxyquire('../lib/actions/spawn_command', {
      'cross-spawn': this.crossSpawn
    });
  });

  it('provide default options', function () {
    this.spawn('foo');
    sinon.assert.calledWith(this.crossSpawn, 'foo', undefined, { stdio: 'inherit' });
  });

  it('pass arguments', function () {
    this.spawn('foo', 'bar');
    sinon.assert.calledWith(this.crossSpawn, 'foo', 'bar', { stdio: 'inherit' });
  });

  it('pass options', function () {
    this.spawn('foo', undefined, { foo: 1 });
    sinon.assert.calledWith(this.crossSpawn, 'foo', undefined, { foo: 1, stdio: 'inherit' });
  });

  it('allow overriding default options', function () {
    this.spawn('foo', undefined, { stdio: 'wut' });
    sinon.assert.calledWith(this.crossSpawn, 'foo', undefined, { stdio: 'wut' });
  });
});
