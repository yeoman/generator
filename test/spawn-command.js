import {createRequire} from 'node:module';
import sinon from 'sinon';
import esmock from 'esmock';

const require = createRequire(import.meta.url);

describe('generators.Base (actions/spawn-command)', () => {
  let cwd;

  beforeEach(async function () {
    this.crossSpawn = sinon.spy();
    this.crossSpawnSync = sinon.spy();
    this.spawn = await esmock(require.resolve('../src/actions/spawn-command'), {
      execa: {
        execa: this.crossSpawn,
        execaSync: this.crossSpawnSync,
      },
    });
    cwd = Math.random().toString(36).slice(7);
    this.spawn.destinationRoot = sinon.stub().returns(cwd);
  });

  describe('#spawnCommand()', () => {
    it('provide default options', function () {
      this.spawn.spawnCommand('foo');
      sinon.assert.calledWith(this.crossSpawn, 'foo', undefined, {
        cwd,
        stdio: 'inherit',
      });
    });

    it('pass arguments', function () {
      this.spawn.spawnCommand('foo', 'bar');
      sinon.assert.calledWith(this.crossSpawn, 'foo', 'bar', {
        cwd,
        stdio: 'inherit',
      });
    });

    it('pass options', function () {
      this.spawn.spawnCommand('foo', undefined, {foo: 1});
      sinon.assert.calledWith(this.crossSpawn, 'foo', undefined, {
        cwd,
        foo: 1,
        stdio: 'inherit',
      });
    });

    it('allow overriding default options', function () {
      this.spawn.spawnCommand('foo', undefined, {stdio: 'ignore'});
      sinon.assert.calledWith(this.crossSpawn, 'foo', undefined, {
        cwd,
        stdio: 'ignore',
      });
    });
  });

  describe('#spawnCommandSync()', () => {
    it('provide default options', function () {
      this.spawn.spawnCommandSync('foo');
      sinon.assert.calledWith(this.crossSpawnSync, 'foo', undefined, {
        cwd,
        stdio: 'inherit',
      });
    });

    it('pass arguments', function () {
      this.spawn.spawnCommandSync('foo', 'bar');
      sinon.assert.calledWith(this.crossSpawnSync, 'foo', 'bar', {
        cwd,
        stdio: 'inherit',
      });
    });

    it('pass options', function () {
      this.spawn.spawnCommandSync('foo', undefined, {foo: 1});
      sinon.assert.calledWith(this.crossSpawnSync, 'foo', undefined, {
        cwd,
        foo: 1,
        stdio: 'inherit',
      });
    });

    it('allow overriding default options', function () {
      this.spawn.spawnCommandSync('foo', undefined, {stdio: 'wut'});
      sinon.assert.calledWith(this.crossSpawnSync, 'foo', undefined, {
        cwd,
        stdio: 'wut',
      });
    });
  });
});
