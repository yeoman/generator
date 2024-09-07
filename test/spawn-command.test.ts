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
            stdio: 'inherit',
          });
        });
      });
    });

    describe('calls spawn if args and/or opts are given', () => {
      it('args given are passed to spawnSync', () => {
        const spawnSpy = spy(testGenerator, 'spawn');
        testGenerator.spawnCommand('foo', ['bar']);
        assert.ok(spawnSpy.calledWith('foo', ['bar']));
      });
      it('opts given are passed to spawnSync', () => {
        const spawnSpy = spy(testGenerator, 'spawn');
        testGenerator.spawnCommand('foo', undefined, { verbose: true });
        assert.ok(spawnSpy.calledWith('foo', undefined, { verbose: true }));
      });
      it('both args and opts given are passed to spawnSync', () => {
        const spawnSpy = spy(testGenerator, 'spawn');
        testGenerator.spawnCommand('foo', ['bar'], { verbose: true });
        assert.ok(spawnSpy.calledWith('foo', ['bar'], { verbose: true }));
      });
    });
  });

  describe('#spawn() calls execa()', () => {
    describe('only the command is required', () => {
      describe('no args and no options are given', () => {
        it('calls execaSync with the command, args, {stdio: "inherit", cwd: this.destinationRoot()}', () => {
          testGenerator.spawn('foo');
          expect(execa).toHaveBeenCalledWith('foo', undefined, {
            cwd: testGenerator.destinationRoot(),
            stdio: 'inherit',
          });
        });
      });
    });

    it('passes any args and opts along to execa()', () => {
      // @ts-expect-error We know that spawn exists on the generator. It is added with applyMixins().
      testGenerator.spawn('foo', ['arg1', 2, 'the third arg'], { verbose: true });
      expect(execa).toHaveBeenCalledWith('foo', ['arg1', 2, 'the third arg'], {
        cwd: testGenerator.destinationRoot(),
        stdio: 'inherit',
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
            stdio: 'inherit',
          });
        });
      });
    });

    describe('calls spawnSync if args and/or opts are given', () => {
      it('args given are passed to spawnSync', () => {
        const spawnSyncSpy = spy(testGenerator, 'spawnSync');
        testGenerator.spawnCommandSync('foo', ['bar']);
        assert.ok(spawnSyncSpy.calledWith('foo', ['bar']));
      });
      it('opts given are passed to spawnSync', () => {
        const spawnSyncSpy = spy(testGenerator, 'spawnSync');
        testGenerator.spawnCommandSync('foo', undefined, { verbose: true });
        assert.ok(spawnSyncSpy.calledWith('foo', undefined, { verbose: true }));
      });
      it('both args and opts given are passed to spawnSync', () => {
        const spawnSyncSpy = spy(testGenerator, 'spawnSync');
        testGenerator.spawnCommandSync('foo', ['bar'], { verbose: true });
        assert.ok(spawnSyncSpy.calledWith('foo', ['bar'], { verbose: true }));
      });
    });
  });

  describe('#spawnSync() calls execaSync', () => {
    describe('only the command is required', () => {
      describe('no args and no options are given', () => {
        it('calls execaSync with the command, args, {stdio: "inherit", cwd: this.destinationRoot()}', () => {
          testGenerator.spawnSync('foo');
          expect(execaSync).toHaveBeenCalledWith('foo', undefined, {
            cwd: testGenerator.destinationRoot(),
            stdio: 'inherit',
          });
        });
      });
    });

    it('passes any args and opts along to execaSync()', () => {
      testGenerator.spawnSync('foo', ['arg1', 2, 'the third arg'], { verbose: true });
      expect(execaSync).toHaveBeenCalledWith('foo', ['arg1', 2, 'the third arg'], {
        cwd: testGenerator.destinationRoot(),
        stdio: 'inherit',
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
