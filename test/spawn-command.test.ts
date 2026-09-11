import Generator from './utils.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { execa, execaSync } from 'execa';

vi.mock('execa', async importOriginal => ({
  ...(await importOriginal()),
  execa: vi.fn(),
  execaSync: vi.fn(),
}));

describe('generators.Base (actions/spawn-command)', () => {
  let testGenerator: Generator;

  beforeEach(async () => {
    testGenerator = new Generator({ help: true, namespace: 'foo', resolved: 'unknown' });
    testGenerator.destinationRoot = vi.fn().mockReturnValue('some/destination/path');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('#spawnCommand()', () => {
    describe('only the command is required', () => {
      describe('no args and no options are given', () => {
        it('calls execa with the parsed command, {cwd: this.destinationRoot()}', () => {
          testGenerator.spawnCommand('foo');
          expect(execa).toHaveBeenCalledWith('foo', [], {
            cwd: testGenerator.destinationRoot(),
          });
        });
      });
    });

    it('splits the command string into file and arguments', () => {
      testGenerator.spawnCommand('npm run the\\ task --silent');
      expect(execa).toHaveBeenCalledWith('npm', ['run', 'the task', '--silent'], {
        cwd: testGenerator.destinationRoot(),
      });
    });

    it('opts given are passed to spawnCommand', () => {
      const spawnSpy = vi.spyOn(testGenerator, 'spawnCommand');
      testGenerator.spawnCommand('foo', { verbose: 'short' });
      expect(spawnSpy).toHaveBeenCalledWith('foo', { verbose: 'short' });
    });
  });

  describe('#spawn() calls execa()', () => {
    describe('only the command is required', () => {
      describe('no args and no options are given', () => {
        it('calls execaSync with the command, args, {stdio: "inherit", cwd: this.destinationRoot()}', () => {
          testGenerator.spawn('foo');
          expect(execa).toHaveBeenCalledWith('foo', undefined, {
            cwd: testGenerator.destinationRoot(),
          });
        });
      });
    });

    it('passes any args and opts along to execa()', () => {
      // @ts-expect-error We know that spawn exists on the generator. It is added with applyMixins().
      testGenerator.spawn('foo', ['arg1', 2, 'the third arg'], { verbose: true });
      expect(execa).toHaveBeenCalledWith('foo', ['arg1', 2, 'the third arg'], {
        cwd: testGenerator.destinationRoot(),
        verbose: true,
      });
    });

    it('can override default stdio option', () => {
      testGenerator.spawn('foo', undefined, { stdio: 'pipe' });
      expect(execa).toHaveBeenCalledWith('foo', undefined, {
        cwd: testGenerator.destinationRoot(),
        stdio: 'pipe',
      });
    });
  });

  describe('#spawnCommandSync()', () => {
    describe('only the command is required', () => {
      describe('no args and no options are given', () => {
        it('calls execaSync with the parsed command, {cwd: this.destinationRoot()}', () => {
          testGenerator.spawnCommandSync('foo');
          expect(execaSync).toHaveBeenCalledWith('foo', [], {
            cwd: testGenerator.destinationRoot(),
          });
        });
      });
    });

    it('splits the command string into file and arguments', () => {
      testGenerator.spawnCommandSync('npm run the\\ task --silent');
      expect(execaSync).toHaveBeenCalledWith('npm', ['run', 'the task', '--silent'], {
        cwd: testGenerator.destinationRoot(),
      });
    });

    it('opts given are passed to spawnCommandSync', () => {
      const spawnSyncSpy = vi.spyOn(testGenerator, 'spawnCommandSync');
      testGenerator.spawnCommandSync('foo', { verbose: 'short' });
      expect(spawnSyncSpy).toHaveBeenCalledWith('foo', { verbose: 'short' });
    });
  });

  describe('#spawnSync() calls execaSync', () => {
    describe('only the command is required', () => {
      describe('no args and no options are given', () => {
        it('calls execaSync with the command, args, {stdio: "inherit", cwd: this.destinationRoot()}', () => {
          testGenerator.spawnSync('foo');
          expect(execaSync).toHaveBeenCalledWith('foo', undefined, {
            cwd: testGenerator.destinationRoot(),
          });
        });
      });
    });

    it('passes any args and opts along to execaSync()', () => {
      testGenerator.spawnSync('foo', ['arg1', '2', 'the third arg'], { verbose: 'short' });
      expect(execaSync).toHaveBeenCalledWith('foo', ['arg1', '2', 'the third arg'], {
        cwd: testGenerator.destinationRoot(),
        verbose: 'short',
      });
    });

    it('can override default stdio option', () => {
      testGenerator.spawnSync('foo', undefined, { stdio: 'pipe' });
      expect(execaSync).toHaveBeenCalledWith('foo', undefined, {
        cwd: testGenerator.destinationRoot(),
        stdio: 'pipe',
      });
    });
  });
});
