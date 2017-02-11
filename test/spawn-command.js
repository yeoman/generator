'use strict';
const proxyquire = require('proxyquire');
const sinon = require('sinon');

describe('generators.Base (actions/spawn-command)', () => {
  beforeEach(function () {
    this.crossSpawn = sinon.spy();
    this.crossSpawn.sync = sinon.spy();
    this.spawn = proxyquire('../lib/actions/spawn-command', {
      'cross-spawn': this.crossSpawn
    });
  });

  describe('#spawnCommand()', () => {
    it('provide default options', function () {
      this.spawn.spawnCommand('foo');
      sinon.assert.calledWith(this.crossSpawn, 'foo', undefined, {stdio: 'inherit'});
    });

    it('pass arguments', function () {
      this.spawn.spawnCommand('foo', 'bar');
      sinon.assert.calledWith(this.crossSpawn, 'foo', 'bar', {stdio: 'inherit'});
    });

    it('pass options', function () {
      this.spawn.spawnCommand('foo', undefined, {foo: 1});
      sinon.assert.calledWith(this.crossSpawn, 'foo', undefined, {foo: 1, stdio: 'inherit'});
    });

    it('allow overriding default options', function () {
      this.spawn.spawnCommand('foo', undefined, {stdio: 'wut'});
      sinon.assert.calledWith(this.crossSpawn, 'foo', undefined, {stdio: 'wut'});
    });
  });

  describe('#spawnCommandSync()', () => {
    it('provide default options', function () {
      this.spawn.spawnCommandSync('foo');
      sinon.assert.calledWith(this.crossSpawn.sync, 'foo', undefined, {stdio: 'inherit'});
    });

    it('pass arguments', function () {
      this.spawn.spawnCommandSync('foo', 'bar');
      sinon.assert.calledWith(this.crossSpawn.sync, 'foo', 'bar', {stdio: 'inherit'});
    });

    it('pass options', function () {
      this.spawn.spawnCommandSync('foo', undefined, {foo: 1});
      sinon.assert.calledWith(this.crossSpawn.sync, 'foo', undefined, {foo: 1, stdio: 'inherit'});
    });

    it('allow overriding default options', function () {
      this.spawn.spawnCommandSync('foo', undefined, {stdio: 'wut'});
      sinon.assert.calledWith(this.crossSpawn.sync, 'foo', undefined, {stdio: 'wut'});
    });
  });
});
