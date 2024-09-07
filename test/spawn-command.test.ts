import assert from 'node:assert';
import Generator from '../src/index.js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { spy } from 'sinon';
import { execa, execaCommand, execaCommandSync, execaSync } from 'execa';


vi.mock('pg', () => ({
  execa: vi.fn(execa),
  execaSync: vi.fn(execaSync),
  execaCommand: vi.fn(execaCommand),
  execaCommandSync: vi.fn(execaCommandSync),
}))

describe.skip('generators.Base (actions/spawn-command)', () => {
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
        // @ts-expect-error We know that spawn exists on the generator. It is added with applyMixins().
        const spawnSpy = spy(testGenerator, 'spawn');
        // @ts-expect-error We know that spawnCommand exists on the generator. It is added with applyMixins().
        testGenerator.spawnCommand('foo', ['bar']);
        // @ts-expect-error TypeScript doesn't like the args type for .calledWith
        assert.ok(spawnSpy.calledWith('foo', ['bar']));
      });
      it('opts given are passed to spawnSync', () => {
        // @ts-expect-error We know that spawn exists on the generator. It is added with applyMixins().
        const spawnSpy = spy(testGenerator, 'spawn');
        // @ts-expect-error We know that spawnCommand exists on the generator. It is added with applyMixins().
        testGenerator.spawnCommand('foo', undefined, { verbose: true });
        // @ts-expect-error TypeScript doesn't like the args type for .calledWith
        assert.ok(spawnSpy.calledWith('foo', undefined, { verbose: true }));
      });
      it('both args and opts given are passed to spawnSync', () => {
        // @ts-expect-error We know that spawn exists on the generator. It is added with applyMixins().
        const spawnSpy = spy(testGenerator, 'spawn');
        // @ts-expect-error We know that spawnCommand exists on the generator. It is added with applyMixins().
        testGenerator.spawnCommand('foo', ['bar'], { verbose: true });
        // @ts-expect-error TypeScript doesn't like the args type for .calledWith
        assert.ok(spawnSpy.calledWith('foo', ['bar'], { verbose: true }));
      });
    });
  });

  describe('#spawn() calls execa()', () => {
    describe('only the command is required', () => {
      describe('no args and no options are given', () => {
        it('calls execaSync with the command, args, {stdio: "inherit", cwd: this.destinationRoot()}', () => {
          // @ts-expect-error We know that spawn exists on the generator. It is added with applyMixins().
          testGenerator.spawn('foo');
          expect(execa).toHaveBeenCalledWith('foo', undefined, {
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
      expect(execa).toHaveBeenCalledWith('foo', ['arg1', 2, 'the third arg'], {
        // @ts-expect-error We know that destinationRoot() exists for the generator.
        cwd: testGenerator.destinationRoot(),
        stdio: 'inherit',
        verbose: true,
      });
    });

    it('can override default stdio option', () => {
      // @ts-expect-error We know that spawn exists on the generator. It is added with applyMixins().
      testGenerator.spawn('foo', undefined, { stdio: 'pipe' });
      expect(execa).toHaveBeenCalledWith('foo', undefined, {
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
          expect(execaCommandSync).toHaveBeenCalledWith('foo', {
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
        assert.ok(spawnSyncSpy.calledWith('foo', ['bar']));
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
          expect(execaSync).toHaveBeenCalledWith('foo', undefined, {
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
      expect(execaSync).toHaveBeenCalledWith('foo', ['arg1', 2, 'the third arg'], {
        // @ts-expect-error We know that destinationRoot() exists for the generator.
        cwd: testGenerator.destinationRoot(),
        stdio: 'inherit',
        verbose: true,
      });
    });

    it('can override default stdio option', () => {
      // @ts-expect-error We know that spawnSync exists on the generator. It is added with applyMixins().
      testGenerator.spawnSync('foo', undefined, { stdio: 'pipe' });
      expect(execaSync).toHaveBeenCalledWith('foo', undefined, {
        // @ts-expect-error We know that destinationRoot() exists for the generator.
        cwd: testGenerator.destinationRoot(),
        stdio: 'pipe',
      });
    });
  });
});
