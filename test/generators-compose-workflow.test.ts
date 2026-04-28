/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TestAdapter } from '@yeoman/adapter/testing';
import Environment from 'yeoman-environment';
import helpers from 'yeoman-test';
import Base from './utils.js';

const createEnv = () => new Environment({ skipInstall: true, adapter: new TestAdapter() });

describe('Multiples generators', () => {
  let env: Environment;

  let Dummy: typeof Base;
  let dummy: Base;
  let dummy2: Base;

  let spyExec: ReturnType<typeof vi.fn>;
  let spyExec1: ReturnType<typeof vi.fn>;
  let spyInit1: ReturnType<typeof vi.fn>;
  let spyWrite1: ReturnType<typeof vi.fn>;
  let spyEnd1: ReturnType<typeof vi.fn>;
  let spyExec2: ReturnType<typeof vi.fn>;
  let spyInit2: ReturnType<typeof vi.fn>;
  let spyWrite2: ReturnType<typeof vi.fn>;
  let spyEnd2: ReturnType<typeof vi.fn>;
  let spyExec3: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    await helpers.prepareTemporaryDir().run();

    env = createEnv();
    Dummy = class extends Base {};
    spyExec = vi.fn();
    Dummy.prototype.exec = spyExec;
  });

  describe('#composeWith() with multiples generators', () => {
    beforeEach(() => {
      dummy = new Dummy([], {
        resolved: 'unknown',
        namespace: 'dummy',
        env: env,
        'skip-install': true,
        'force-install': true,
        'skip-cache': true,
      });

      spyExec1 = vi.fn();
      spyInit1 = vi.fn();
      spyWrite1 = vi.fn();
      spyEnd1 = vi.fn();

      const GenCompose1 = class extends Base {};
      GenCompose1.prototype.exec = spyExec1;
      GenCompose1.prototype.initializing = spyInit1;
      GenCompose1.prototype.writing = spyWrite1;
      GenCompose1.prototype.end = spyEnd1;

      spyExec2 = vi.fn();
      spyInit2 = vi.fn();
      spyWrite2 = vi.fn();
      spyEnd2 = vi.fn();

      const GenCompose2 = class extends Base {};
      GenCompose2.prototype.exec = spyExec2;
      GenCompose2.prototype.initializing = spyInit2;
      GenCompose2.prototype.writing = spyWrite2;
      GenCompose2.prototype.end = spyEnd2;

      env.register(GenCompose1, { namespace: 'composed:gen' });
      env.register(GenCompose2, { namespace: 'composed:gen2' });
    });

    it('runs multiple composed generators', async () => {
      await dummy.composeWith(['composed:gen', 'composed:gen2']);

      const runSpy = vi.spyOn(dummy, 'run');

      // I use a setTimeout here just to make sure composeWith() doesn't start the
      // generator before the base one is ran.
      await dummy.run();
      expect(spyInit1.mock.invocationCallOrder[0]).toBeGreaterThan(runSpy.mock.invocationCallOrder[0]);
      expect(spyInit2.mock.invocationCallOrder[0]).toBeGreaterThan(spyInit1.mock.invocationCallOrder[0]);
      expect(spyExec1.mock.invocationCallOrder[0]).toBeGreaterThan(spyInit2.mock.invocationCallOrder[0]);
      expect(spyExec2.mock.invocationCallOrder[0]).toBeGreaterThan(spyExec1.mock.invocationCallOrder[0]);
    });

    it('runs multiple composed generators (reverse)', async () => {
      await dummy.composeWith(['composed:gen2', 'composed:gen']);

      const runSpy = vi.spyOn(dummy, 'run');
      await dummy.run();
      expect(spyInit2.mock.invocationCallOrder[0]).toBeGreaterThan(runSpy.mock.invocationCallOrder[0]);
      expect(spyInit1.mock.invocationCallOrder[0]).toBeGreaterThan(spyInit2.mock.invocationCallOrder[0]);
      expect(spyExec2.mock.invocationCallOrder[0]).toBeGreaterThan(spyInit1.mock.invocationCallOrder[0]);
      expect(spyExec1.mock.invocationCallOrder[0]).toBeGreaterThan(spyExec2.mock.invocationCallOrder[0]);
    });

    it('runs 3 composed generators', async () => {
      spyExec3 = vi.fn();
      const spyInit3 = vi.fn();
      const GenCompose3 = class extends Base {};
      GenCompose3.prototype.exec = spyExec3;
      GenCompose3.prototype.initializing = spyInit3;

      env.register(GenCompose3, { namespace: 'composed:gen3' });

      await dummy.composeWith(['composed:gen', 'composed:gen2', 'composed:gen3']);

      const runSpy = vi.spyOn(dummy, 'run');
      await dummy.run();
      expect(spyInit1.mock.invocationCallOrder[0]).toBeGreaterThan(runSpy.mock.invocationCallOrder[0]);
      expect(spyInit2.mock.invocationCallOrder[0]).toBeGreaterThan(spyInit1.mock.invocationCallOrder[0]);
      expect(spyInit3.mock.invocationCallOrder[0]).toBeGreaterThan(spyInit2.mock.invocationCallOrder[0]);
      expect(spyExec1.mock.invocationCallOrder[0]).toBeGreaterThan(spyInit3.mock.invocationCallOrder[0]);
      expect(spyExec2.mock.invocationCallOrder[0]).toBeGreaterThan(spyExec1.mock.invocationCallOrder[0]);
      expect(spyExec3.mock.invocationCallOrder[0]).toBeGreaterThan(spyExec2.mock.invocationCallOrder[0]);
    });

    it('runs multiple composed generators inside a running generator', () =>
      new Promise<void>(done => {
        const Dummy2 = class extends Dummy {};

        const writingSpy1 = vi.fn();
        const writingSpy2 = vi.fn();
        const endSpy = vi.fn();
        Dummy2.prototype.end = endSpy;

        Dummy2.prototype.writing = {
          async compose() {
            // Initializing and default is queue and called next (before writingSpy2)
            // Writing is queue after already queued functions (after writingSpy2)
            await this.composeWith(['composed:gen', 'composed:gen2']);
            writingSpy1();
          },
          writingSpy2() {
            writingSpy2();
          },
        };

        dummy2 = new Dummy2([], {
          resolved: 'unknown',
          namespace: 'dummy',
          env: env,
          'skip-install': true,
          'force-install': true,
          'skip-cache': true,
        });

        const runSpy = vi.spyOn(dummy2, 'run');

        // I use a setTimeout here just to make sure composeWith() doesn't start the
        // generator before the base one is ran.
        setTimeout(() => {
          dummy2.run().then(() => {
            expect(writingSpy1.mock.invocationCallOrder[0]).toBeGreaterThan(runSpy.mock.invocationCallOrder[0]);
            expect(spyInit1.mock.invocationCallOrder[0]).toBeGreaterThan(writingSpy1.mock.invocationCallOrder[0]);
            expect(spyInit2.mock.invocationCallOrder[0]).toBeGreaterThan(spyInit1.mock.invocationCallOrder[0]);
            expect(spyExec1.mock.invocationCallOrder[0]).toBeGreaterThan(spyInit2.mock.invocationCallOrder[0]);
            expect(spyExec2.mock.invocationCallOrder[0]).toBeGreaterThan(spyExec1.mock.invocationCallOrder[0]);
            expect(writingSpy2.mock.invocationCallOrder[0]).toBeGreaterThan(spyExec2.mock.invocationCallOrder[0]);
            expect(spyWrite1.mock.invocationCallOrder[0]).toBeGreaterThan(writingSpy2.mock.invocationCallOrder[0]);
            expect(spyWrite2.mock.invocationCallOrder[0]).toBeGreaterThan(spyWrite1.mock.invocationCallOrder[0]);
            expect(endSpy.mock.invocationCallOrder[0]).toBeGreaterThan(spyWrite2.mock.invocationCallOrder[0]);
            expect(spyEnd1.mock.invocationCallOrder[0]).toBeGreaterThan(endSpy.mock.invocationCallOrder[0]);
            expect(spyEnd2.mock.invocationCallOrder[0]).toBeGreaterThan(spyEnd1.mock.invocationCallOrder[0]);
            done();
          });
        }, 100);
      }));

    it('runs multiple composed generators inside a running generator', () =>
      new Promise<void>(done => {
        const Dummy2 = class extends Dummy {};

        const writingSpy1 = vi.fn();
        const writingSpy2 = vi.fn();
        const writingSpy3 = vi.fn();
        const endSpy = vi.fn();

        Dummy2.prototype.end = endSpy;
        Dummy2.prototype.writing = {
          async compose1() {
            // Initializing and default is queue and called next (before writingSpy2)
            // Writing is queue after already queued functions (after writingSpy2, compose2, writingSpy3)
            await this.composeWith('composed:gen');
            writingSpy1();
          },
          writingSpy2() {
            writingSpy2();
          },
          async compose2() {
            await this.composeWith('composed:gen2');
          },
          writingSpy3() {
            writingSpy3();
          },
        };

        dummy2 = new Dummy2([], {
          resolved: 'unknown',
          namespace: 'dummy',
          env: env,
          'skip-install': true,
          'force-install': true,
          'skip-cache': true,
        });

        const runSpy = vi.spyOn(dummy2, 'run');

        // I use a setTimeout here just to make sure composeWith() doesn't start the
        // generator before the base one is ran.
        setTimeout(() => {
          dummy2.run().then(() => {
            expect(writingSpy1.mock.invocationCallOrder[0]).toBeGreaterThan(runSpy.mock.invocationCallOrder[0]);
            expect(spyInit1.mock.invocationCallOrder[0]).toBeGreaterThan(writingSpy1.mock.invocationCallOrder[0]);
            expect(spyExec1.mock.invocationCallOrder[0]).toBeGreaterThan(spyInit1.mock.invocationCallOrder[0]);
            expect(writingSpy2.mock.invocationCallOrder[0]).toBeGreaterThan(spyExec1.mock.invocationCallOrder[0]);
            expect(spyInit2.mock.invocationCallOrder[0]).toBeGreaterThan(writingSpy2.mock.invocationCallOrder[0]);
            expect(spyExec2.mock.invocationCallOrder[0]).toBeGreaterThan(spyExec1.mock.invocationCallOrder[0]);
            expect(writingSpy3.mock.invocationCallOrder[0]).toBeGreaterThan(spyExec2.mock.invocationCallOrder[0]);
            expect(spyWrite1.mock.invocationCallOrder[0]).toBeGreaterThan(writingSpy3.mock.invocationCallOrder[0]);
            expect(spyWrite2.mock.invocationCallOrder[0]).toBeGreaterThan(spyWrite1.mock.invocationCallOrder[0]);
            expect(endSpy.mock.invocationCallOrder[0]).toBeGreaterThan(spyWrite2.mock.invocationCallOrder[0]);
            expect(spyEnd1.mock.invocationCallOrder[0]).toBeGreaterThan(endSpy.mock.invocationCallOrder[0]);
            expect(spyEnd2.mock.invocationCallOrder[0]).toBeGreaterThan(spyEnd1.mock.invocationCallOrder[0]);
            done();
          });
        }, 100);
      }));
  });

  it('#composeWith() inside _beforeQueue', async () => {
    const Generator = class extends Base {
      async _beforeQueue() {
        await this.composeWith('composed:gen2');
      }
    };
    const writingSpy1 = vi.fn();
    Generator.prototype.writing = {
      compose1() {
        writingSpy1();
      },
    };

    const Generator2 = class extends Base {
      async _beforeQueue() {
        await this.composeWith('composed:gen3');
      }
    };
    const writingSpy2 = vi.fn();
    Generator2.prototype.writing = {
      compose2() {
        writingSpy2();
      },
    };

    const Generator3 = class extends Base {};
    const writingSpy3 = vi.fn();
    Generator3.prototype.writing = {
      compose3() {
        writingSpy3();
      },
    };

    env.register(Generator, { namespace: 'composed:gen' });
    env.register(Generator2, { namespace: 'composed:gen2' });
    env.register(Generator3, { namespace: 'composed:gen3' });

    const dummy = new Generator([], {
      resolved: 'unknown',
      namespace: 'dummy',
      env: env,
      'skip-install': true,
      'force-install': true,
      'skip-cache': true,
    });

    await dummy.run();
    expect(writingSpy2.mock.invocationCallOrder[0]).toBeGreaterThan(writingSpy1.mock.invocationCallOrder[0]);
    expect(writingSpy3.mock.invocationCallOrder[0]).toBeGreaterThan(writingSpy2.mock.invocationCallOrder[0]);
  });
});
