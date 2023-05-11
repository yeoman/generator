import { expect } from 'expect';
import { mock, restoreAllMocks, fn, importMock } from 'esmocha';

const execa = await mock('execa');
const { default: Generator } = await importMock('../src/index.js', { execa });

describe('generators.Base (actions/spawn-command)', () => {
  let cwd;
  let spawn;

  beforeEach(async function () {
    spawn = new Generator({ help: true, namespace: 'foo' });
    cwd = Math.random().toString(36).slice(7);
    spawn.destinationRoot = fn().mockReturnValue(cwd);
  });

  afterEach(() => {
    restoreAllMocks();
  });

  describe('#spawnCommand()', () => {
    it('provide default options', async function () {
      await spawn.spawnCommand('foo');
      expect(execa.execa).toHaveBeenCalledWith('foo', undefined, {
        cwd,
        stdio: 'inherit',
      });
    });

    it('pass arguments', async function () {
      await spawn.spawnCommand('foo', ['bar']);
      expect(execa.execa).toHaveBeenCalledWith('foo', ['bar'], {
        cwd,
        stdio: 'inherit',
      });
    });

    it('pass options', async function () {
      await spawn.spawnCommand('foo', undefined, { foo: 1 });
      expect(execa.execa).toHaveBeenCalledWith('foo', undefined, {
        cwd,
        foo: 1,
        stdio: 'inherit',
      });
    });

    it('allow overriding default options', async function () {
      await spawn.spawnCommand('foo', undefined, { stdio: 'ignore' });
      expect(execa.execa).toHaveBeenCalledWith('foo', undefined, {
        cwd,
        stdio: 'ignore',
      });
    });
  });

  describe('#spawnCommandSync()', () => {
    it('provide default options', function () {
      spawn.spawnCommandSync('foo');
      expect(execa.execaSync).toHaveBeenCalledWith('foo', undefined, {
        cwd,
        stdio: 'inherit',
      });
    });

    it('pass arguments', function () {
      spawn.spawnCommandSync('foo', ['bar']);
      expect(execa.execaSync).toHaveBeenCalledWith('foo', ['bar'], {
        cwd,
        stdio: 'inherit',
      });
    });

    it('pass options', function () {
      spawn.spawnCommandSync('foo', undefined, { foo: 1 });
      expect(execa.execaSync).toHaveBeenCalledWith('foo', undefined, {
        cwd,
        foo: 1,
        stdio: 'inherit',
      });
    });

    it('allow overriding default options', function () {
      spawn.spawnCommandSync('foo', undefined, { stdio: 'pipe' });
      expect(execa.execaSync).toHaveBeenCalledWith('foo', undefined, {
        cwd,
        stdio: 'pipe',
      });
    });
  });
});
