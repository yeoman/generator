import { beforeEach, describe, expect, it } from 'vitest';
import { TestAdapter } from '@yeoman/adapter/testing';
import type { SinonSpy } from 'sinon';
import { assert as sinonAssert, spy as sinonSpy } from 'sinon';
import Environment from 'yeoman-environment';
import helpers from 'yeoman-test';
import Base from './utils.js';

const createEnv = () => new Environment({ skipInstall: true, adapter: new TestAdapter() });

describe('Multiples generators', () => {
  let env: Environment;

  let Dummy: typeof Base;
  let dummy: Base;
  let dummy2: Base;

  let spyExec: SinonSpy;
  let spyExec1: SinonSpy;
  let spyInit1: SinonSpy;
  let spyWrite1: SinonSpy;
  let spyEnd1: SinonSpy;
  let spyExec2: SinonSpy;
  let spyInit2: SinonSpy;
  let spyWrite2: SinonSpy;
  let spyEnd2: SinonSpy;
  let spyExec3: SinonSpy;

  beforeEach(async () => {
    await helpers.prepareTemporaryDir().run();

    env = createEnv();
    Dummy = class extends Base {};
    spyExec = sinonSpy();
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

      spyExec1 = sinonSpy();
      spyInit1 = sinonSpy();
      spyWrite1 = sinonSpy();
      spyEnd1 = sinonSpy();

      const GenCompose1 = class extends Base {};
      GenCompose1.prototype.exec = spyExec1;
      GenCompose1.prototype.initializing = spyInit1;
      GenCompose1.prototype.writing = spyWrite1;
      GenCompose1.prototype.end = spyEnd1;

      spyExec2 = sinonSpy();
      spyInit2 = sinonSpy();
      spyWrite2 = sinonSpy();
      spyEnd2 = sinonSpy();

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

      const runSpy = sinonSpy(dummy, 'run');

      // I use a setTimeout here just to make sure composeWith() doesn't start the
      // generator before the base one is ran.
      await dummy.run();
      sinonAssert.callOrder(
        runSpy,
        spyInit1,
        spyInit2,
        spyExec,
        spyExec1,
        spyExec2,
        spyWrite1,
        spyWrite2,
        spyEnd1,
        spyEnd2,
      );
      expect(spyInit1.calledAfter(runSpy)).toBeTruthy();
      expect(spyInit2.calledAfter(spyInit1)).toBeTruthy();
      expect(spyExec1.calledAfter(spyInit2)).toBeTruthy();
      expect(spyExec2.calledAfter(spyExec1)).toBeTruthy();
    });

    it('runs multiple composed generators (reverse)', async () => {
      await dummy.composeWith(['composed:gen2', 'composed:gen']);

      const runSpy = sinonSpy(dummy, 'run');
      await dummy.run();

      sinonAssert.callOrder(
        runSpy,
        spyInit2,
        spyInit1,
        spyExec,
        spyExec2,
        spyExec1,
        spyWrite2,
        spyWrite1,
        spyEnd2,
        spyEnd1,
      );
      expect(spyInit2.calledAfter(runSpy)).toBeTruthy();
      expect(spyInit1.calledAfter(spyInit2)).toBeTruthy();
      expect(spyExec2.calledAfter(spyInit1)).toBeTruthy();
      expect(spyExec1.calledAfter(spyExec2)).toBeTruthy();
    });

    it('runs 3 composed generators', async () => {
      spyExec3 = sinonSpy();
      const spyInit3 = sinonSpy();
      const GenCompose3 = class extends Base {};
      GenCompose3.prototype.exec = spyExec3;
      GenCompose3.prototype.initializing = spyInit3;

      env.register(GenCompose3, { namespace: 'composed:gen3' });

      await dummy.composeWith(['composed:gen', 'composed:gen2', 'composed:gen3']);

      const runSpy = sinonSpy(dummy, 'run');
      await dummy.run();

      sinonAssert.callOrder(
        runSpy,
        spyInit1,
        spyInit2,
        spyInit3,
        spyExec,
        spyExec1,
        spyExec2,
        spyExec3,
        spyWrite1,
        spyWrite2,
        spyEnd1,
        spyEnd2,
      );
      expect(spyInit1.calledAfter(runSpy)).toBeTruthy();
      expect(spyInit2.calledAfter(spyInit1)).toBeTruthy();
      expect(spyInit3.calledAfter(spyInit2)).toBeTruthy();
      expect(spyExec1.calledAfter(spyInit3)).toBeTruthy();
      expect(spyExec2.calledAfter(spyExec1)).toBeTruthy();
      expect(spyExec3.calledAfter(spyExec2)).toBeTruthy();
    });

    it('runs multiple composed generators inside a running generator', () =>
      new Promise<void>(done => {
        const Dummy2 = class extends Dummy {};

        const writingSpy1 = sinonSpy();
        const writingSpy2 = sinonSpy();
        const endSpy = sinonSpy();
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

        const runSpy = sinonSpy(dummy2, 'run');

        // I use a setTimeout here just to make sure composeWith() doesn't start the
        // generator before the base one is ran.
        setTimeout(() => {
          dummy2.run().then(() => {
            sinonAssert.callOrder(
              runSpy,
              writingSpy1,
              spyInit1,
              spyInit2,
              spyExec1,
              spyExec2,
              writingSpy2,
              spyWrite1,
              spyWrite2,
              endSpy,
              spyEnd1,
              spyEnd2,
            );
            expect(writingSpy1.calledAfter(runSpy)).toBeTruthy();
            expect(spyInit1.calledAfter(writingSpy1)).toBeTruthy();
            expect(spyInit2.calledAfter(spyInit1)).toBeTruthy();
            expect(spyExec1.calledAfter(spyInit2)).toBeTruthy();
            expect(spyExec2.calledAfter(spyExec1)).toBeTruthy();
            expect(writingSpy2.calledAfter(spyExec2)).toBeTruthy();
            expect(spyWrite1.calledAfter(writingSpy2)).toBeTruthy();
            expect(spyWrite2.calledAfter(spyWrite1)).toBeTruthy();
            expect(endSpy.calledAfter(spyWrite2)).toBeTruthy();
            expect(spyEnd1.calledAfter(endSpy)).toBeTruthy();
            expect(spyEnd2.calledAfter(spyEnd1)).toBeTruthy();
            done();
          });
        }, 100);
      }));

    it('runs multiple composed generators inside a running generator', () =>
      new Promise<void>(done => {
        const Dummy2 = class extends Dummy {};

        const writingSpy1 = sinonSpy();
        const writingSpy2 = sinonSpy();
        const writingSpy3 = sinonSpy();
        const endSpy = sinonSpy();

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

        const runSpy = sinonSpy(dummy2, 'run');

        // I use a setTimeout here just to make sure composeWith() doesn't start the
        // generator before the base one is ran.
        setTimeout(() => {
          dummy2.run().then(() => {
            sinonAssert.callOrder(
              runSpy,
              writingSpy1,
              spyInit1,
              spyExec1,
              writingSpy2,
              spyInit2,
              spyExec2,
              writingSpy3,
              spyWrite1,
              spyWrite2,
              endSpy,
              spyEnd1,
              spyEnd2,
            );
            expect(writingSpy1.calledAfter(runSpy)).toBeTruthy();
            expect(spyInit1.calledAfter(writingSpy1)).toBeTruthy();
            expect(spyExec1.calledAfter(spyInit1)).toBeTruthy();
            expect(writingSpy2.calledAfter(spyExec1)).toBeTruthy();
            expect(spyInit2.calledAfter(writingSpy2)).toBeTruthy();
            expect(spyExec2.calledAfter(spyExec1)).toBeTruthy();
            expect(writingSpy3.calledAfter(spyExec2)).toBeTruthy();
            expect(spyWrite1.calledAfter(writingSpy3)).toBeTruthy();
            expect(spyWrite2.calledAfter(spyWrite1)).toBeTruthy();
            expect(endSpy.calledAfter(spyWrite2)).toBeTruthy();
            expect(spyEnd1.calledAfter(endSpy)).toBeTruthy();
            expect(spyEnd2.calledAfter(spyEnd1)).toBeTruthy();
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
    const writingSpy1 = sinonSpy();
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
    const writingSpy2 = sinonSpy();
    Generator2.prototype.writing = {
      compose2() {
        writingSpy2();
      },
    };

    const Generator3 = class extends Base {};
    const writingSpy3 = sinonSpy();
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
    expect(writingSpy2.calledAfter(writingSpy1)).toBeTruthy();
    expect(writingSpy3.calledAfter(writingSpy2)).toBeTruthy();
  });
});
