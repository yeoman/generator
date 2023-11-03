import { expect, mock, restoreAllMocks, fn, importMock } from 'esmocha';

const execa = await mock('execa');
const { default: Generator } = await importMock('../src/index.js', { execa });

describe('generators.Base (actions/spawn-command)', () => {
  let cwd;
  let spawn;

  beforeEach(async function () {
    spawn = new Generator({ help: true, namespace: 'foo', resolved: 'unknown' });
    cwd = Math.random().toString(36).slice(7);
    spawn.destinationRoot = fn().mockReturnValue(cwd);
  });

  afterEach(() => {
    restoreAllMocks();
  });

  describe('#spawnCommand()', () => {
    it('provide default options', async function () {
      await spawn.spawnCommand('foo');
      expect(execa.execaCommand).toHaveBeenCalledWith('foo', {
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
      expect(execa.execaCommandSync).toHaveBeenCalledWith('foo', {
        cwd,
        stdio: 'inherit',
      });
    });

    it('pass arguments', function () {
      spawn.spawnCommandSync('foo', ['bar']);
      expect(execa.execaSync).toHaveBeenCalledWith('foo', ['bar'], {
        cwd,
        stdio: 'inherit',
  describe('#spawnSync() calls execaSync', () => {
    describe('only the command is required', () => {
      describe('no args and no options are given', () => {
        it('calls execaSync with the command, args, {stdio: "inherit", cwd: this.destinationRoot()}', () => {
          // @ts-expect-error We know that spawnSync exists on the generator. It is added with applyMixins().
          testGenerator.spawnSync('foo');
          expect(execa.execaSync).toHaveBeenCalledWith('foo', undefined, {
            // @ts-expect-error We know that destinationRoot() exists for the generator.
            cwd: testGenerator.destinationRoot(),
            stdio: 'inherit',
          });
        });
      });
    });

    it('passes any args and opts along to execaSync()', () => {
      // @ts-expect-error We know that spawnSync exists on the generator. It is added with applyMixins().
      testGenerator.spawnSync('foo', ['arg1', 2, 'the third arg'], { verbose: true });
      expect(execa.execaSync).toHaveBeenCalledWith('foo', ['arg1', 2, 'the third arg'], {
        // @ts-expect-error We know that destinationRoot() exists for the generator.
        cwd: testGenerator.destinationRoot(),
        stdio: 'inherit',
        verbose: true,
      });
    });

    it('can override default stdio option', () => {
      // @ts-expect-error We know that spawnSync exists on the generator. It is added with applyMixins().
      testGenerator.spawnSync('foo', undefined, { stdio: 'pipe' });
      expect(execa.execaSync).toHaveBeenCalledWith('foo', undefined, {
        // @ts-expect-error We know that destinationRoot() exists for the generator.
        cwd: testGenerator.destinationRoot(),
        stdio: 'pipe',
      });
    });
  });
});
