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
  describe('#spawn() calls execa()', () => {
    describe('only the command is required', () => {
      describe('no args and no options are given', () => {
        it('calls execaSync with the command, args, {stdio: "inherit", cwd: this.destinationRoot()}', () => {
          // @ts-expect-error We know that spawn exists on the generator. It is added with applyMixins().
          testGenerator.spawn('foo');
          expect(execa.execa).toHaveBeenCalledWith('foo', undefined, {
            // @ts-expect-error We know that destinationRoot() exists for the generator.
            cwd: testGenerator.destinationRoot(),
            stdio: 'inherit',
          });
        });
      });
    });

    it('passes any args and opts along to execa()', () => {
      // @ts-expect-error We know that spawn exists on the generator. It is added with applyMixins().
      testGenerator.spawn('foo', ['arg1', 2, 'the third arg'], { verbose: true });
      expect(execa.execa).toHaveBeenCalledWith('foo', ['arg1', 2, 'the third arg'], {
        // @ts-expect-error We know that destinationRoot() exists for the generator.
        cwd: testGenerator.destinationRoot(),
        stdio: 'inherit',
        verbose: true,
      });
    });

    it('can override default stdio option', () => {
      // @ts-expect-error We know that spawn exists on the generator. It is added with applyMixins().
      testGenerator.spawn('foo', undefined, { stdio: 'pipe' });
      expect(execa.execa).toHaveBeenCalledWith('foo', undefined, {
        // @ts-expect-error We know that destinationRoot() exists for the generator.
        cwd: testGenerator.destinationRoot(),
        stdio: 'pipe',
      });
    });
  });

  describe('#spawnCommandSync()', () => {
    describe('only the command is required', () => {
      describe('no args and no options are given', () => {
        it('calls execaCommandSync with the command, {stdio: "inherit", cwd: this.destinationRoot()}', () => {
          // @ts-expect-error We know that spawnCommandSync exists on the generator. It is added with applyMixins().
          testGenerator.spawnCommandSync('foo');
          expect(execa.execaCommandSync).toHaveBeenCalledWith('foo', {
            // @ts-expect-error We know that destinationRoot() exists for the generator.
            cwd: testGenerator.destinationRoot(),
            stdio: 'inherit',
          });
        });
      });
    });

    describe('calls spawnSync if args and/or opts are given', () => {
      it('args given are passed to spawnSync', () => {
        // @ts-expect-error We know that spawnSync exists on the generator. It is added with applyMixins().
        const spawnSyncSpy = spy(testGenerator, 'spawnSync');
        // @ts-expect-error We know that spawnCommandSync exists on the generator. It is added with applyMixins().
        testGenerator.spawnCommandSync('foo', ['bar']);
        // @ts-expect-error TypeScript doesn't like the args type for .calledWith
        assert.ok(spawnSyncSpy.calledWith('foo', ['bar'], undefined));
      });
      it('opts given are passed to spawnSync', () => {
        // @ts-expect-error We know that spawnSync exists on the generator. It is added with applyMixins().
        const spawnSyncSpy = spy(testGenerator, 'spawnSync');
        // @ts-expect-error We know that spawnCommandSync exists on the generator. It is added with applyMixins().
        testGenerator.spawnCommandSync('foo', undefined, { verbose: true });
        // @ts-expect-error TypeScript doesn't like the args type for .calledWith
        assert.ok(spawnSyncSpy.calledWith('foo', undefined, { verbose: true }));
      });
      it('both args and opts given are passed to spawnSync', () => {
        // @ts-expect-error We know that spawnSync exists on the generator. It is added with applyMixins().
        const spawnSyncSpy = spy(testGenerator, 'spawnSync');
        // @ts-expect-error We know that spawnCommandSync exists on the generator. It is added with applyMixins().
        testGenerator.spawnCommandSync('foo', ['bar'], { verbose: true });
        // @ts-expect-error TypeScript doesn't like the args type for .calledWith
        assert.ok(spawnSyncSpy.calledWith('foo', ['bar'], { verbose: true }));
      });
    });
  });

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
