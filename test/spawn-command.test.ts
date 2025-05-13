import assert from 'node:assert';
import Generator from '../src/index.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { spy } from 'sinon';
import { execa, execaCommand, execaCommandSync, execaSync } from 'execa';

vi.mock('execa', () => ({
  execa: vi.fn(),
  execaSync: vi.fn(),
  execaCommand: vi.fn(),
  execaCommandSync: vi.fn(),
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
        it('calls execaCommandSync with the command, {stdio: "inherit", cwd: this.destinationRoot()}', () => {
          testGenerator.spawnCommand('foo');
          expect(execaCommand).toHaveBeenCalledWith('foo', {
            cwd: testGenerator.destinationRoot(),
          });
        });
      });
    });

    it('opts given are passed to spawnCommand', () => {
      const spawnSpy = spy(testGenerator, 'spawnCommand');
      testGenerator.spawnCommand('foo', { verbose: true });
      assert.ok(spawnSpy.calledWith('foo', { verbose: true }));
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
        it('calls execaCommandSync with the command, {stdio: "inherit", cwd: this.destinationRoot()}', () => {
          testGenerator.spawnCommandSync('foo');
          expect(execaCommandSync).toHaveBeenCalledWith('foo', {
            cwd: testGenerator.destinationRoot(),
          });
        });
      });
    });

    it('opts given are passed to spawnCommandSync', () => {
      const spawnSyncSpy = spy(testGenerator, 'spawnCommandSync');
      testGenerator.spawnCommandSync('foo', { verbose: true });
      assert.ok(spawnSyncSpy.calledWith('foo', { verbose: true }));
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
      testGenerator.spawnSync('foo', ['arg1', 2, 'the third arg'], { verbose: true });
      expect(execaSync).toHaveBeenCalledWith('foo', ['arg1', 2, 'the third arg'], {
        cwd: testGenerator.destinationRoot(),
        verbose: true,
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
