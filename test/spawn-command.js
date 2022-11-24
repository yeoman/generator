import sinon from 'sinon';
import {createRequire} from 'module';

const require = createRequire(import.meta.url);
const proxyquire = require('proxyquire');

describe('generators.Base (actions/spawn-command)', () => {
  let cwd;

  beforeEach(function () {
    this.crossSpawn = sinon.spy();
    this.crossSpawn.sync = sinon.spy();
    this.spawn = proxyquire('../lib/actions/spawn-command', {
      execa: this.crossSpawn
    });
    cwd = Math.random().toString(36).slice(7);
    this.spawn.destinationRoot = sinon.stub().returns(cwd);
  });

  describe('#spawnCommand()', () => {
    it('provide default options', function () {
      this.spawn.spawnCommand('foo');
      sinon.assert.calledWith(this.crossSpawn, 'foo', undefined, {
        cwd,
        stdio: 'inherit'
      });
    });

    it('pass arguments', function () {
      this.spawn.spawnCommand('foo', 'bar');
      sinon.assert.calledWith(this.crossSpawn, 'foo', 'bar', {
        cwd,
        stdio: 'inherit'
      });
    });

    it('pass options', function () {
      this.spawn.spawnCommand('foo', undefined, {foo: 1});
      sinon.assert.calledWith(this.crossSpawn, 'foo', undefined, {
        cwd,
        foo: 1,
        stdio: 'inherit'
      });
    });

    it('allow overriding default options', function () {
      this.spawn.spawnCommand('foo', undefined, {stdio: 'ignore'});
      sinon.assert.calledWith(this.crossSpawn, 'foo', undefined, {
        cwd,
        stdio: 'ignore'
      });
    });
  });

  describe('#spawnCommandSync()', () => {
    it('provide default options', function () {
      this.spawn.spawnCommandSync('foo');
      sinon.assert.calledWith(this.crossSpawn.sync, 'foo', undefined, {
        cwd,
        stdio: 'inherit'
      });
    });

    it('pass arguments', function () {
      this.spawn.spawnCommandSync('foo', 'bar');
      sinon.assert.calledWith(this.crossSpawn.sync, 'foo', 'bar', {
        cwd,
        stdio: 'inherit'
      });
    });

    it('pass options', function () {
      this.spawn.spawnCommandSync('foo', undefined, {foo: 1});
      sinon.assert.calledWith(this.crossSpawn.sync, 'foo', undefined, {
        cwd,
        foo: 1,
        stdio: 'inherit'
      });
    });

    it('allow overriding default options', function () {
      this.spawn.spawnCommandSync('foo', undefined, {stdio: 'wut'});
      sinon.assert.calledWith(this.crossSpawn.sync, 'foo', undefined, {
        cwd,
        stdio: 'wut'
      });
    });
  });
});
