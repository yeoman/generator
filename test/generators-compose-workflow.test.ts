import os from 'node:os';
import path from 'node:path';
import { mkdirSync } from 'node:fs';
// eslint-disable-next-line n/file-extension-in-import
import { TestAdapter } from '@yeoman/adapter/testing';
import { spy as sinonSpy, assert as sinonAssert } from 'sinon';
import Environment from 'yeoman-environment';
import assert from 'yeoman-assert';
import helpers from 'yeoman-test';
import Base from './utils.js';

const tmpdir = path.join(os.tmpdir(), 'yeoman-base');
const resolveddir = path.join(os.tmpdir(), 'yeoman-base-generator');
const createEnv = () => new Environment({ skipInstall: true, adapter: new TestAdapter() });

describe('Multiples generators', () => {
  beforeEach(helpers.setUpTestDirectory(tmpdir));

  beforeEach(function () {
    this.env = createEnv();
    mkdirSync(resolveddir, { recursive: true });
    this.Dummy = class extends Base {};
    this.spyExec = sinonSpy();
    this.Dummy.prototype.exec = this.spyExec;
  });

  describe('#composeWith() with multiples generators', () => {
    beforeEach(function () {
      this.dummy = new this.Dummy([], {
        resolved: 'unknown',
        namespace: 'dummy',
        env: this.env,
        'skip-install': true,
        'force-install': true,
        'skip-cache': true,
      });

      this.spyExec1 = sinonSpy();
      this.spyInit1 = sinonSpy();
      this.spyWrite1 = sinonSpy();
      this.spyEnd1 = sinonSpy();

      this.GenCompose1 = class extends Base {};
      this.GenCompose1.prototype.exec = this.spyExec1;
      this.GenCompose1.prototype.initializing = this.spyInit1;
      this.GenCompose1.prototype.writing = this.spyWrite1;
      this.GenCompose1.prototype.end = this.spyEnd1;

      this.spyExec2 = sinonSpy();
      this.spyInit2 = sinonSpy();
      this.spyWrite2 = sinonSpy();
      this.spyEnd2 = sinonSpy();

      this.GenCompose2 = class extends Base {};
      this.GenCompose2.prototype.exec = this.spyExec2;
      this.GenCompose2.prototype.initializing = this.spyInit2;
      this.GenCompose2.prototype.writing = this.spyWrite2;
      this.GenCompose2.prototype.end = this.spyEnd2;

      this.env.registerStub(this.GenCompose1, 'composed:gen');
      this.env.registerStub(this.GenCompose2, 'composed:gen2');
    });

    it('runs multiple composed generators', async function () {
      await this.dummy.composeWith(['composed:gen', 'composed:gen2']);

      const runSpy = sinonSpy(this.dummy, 'run');

      // I use a setTimeout here just to make sure composeWith() doesn't start the
      // generator before the base one is ran.
      await this.dummy.run();
      sinonAssert.callOrder(
        runSpy,
        this.spyInit1,
        this.spyInit2,
        this.spyExec,
        this.spyExec1,
        this.spyExec2,
        this.spyWrite1,
        this.spyWrite2,
        this.spyEnd1,
        this.spyEnd2,
      );
      assert(this.spyInit1.calledAfter(runSpy));
      assert(this.spyInit2.calledAfter(this.spyInit1));
      assert(this.spyExec1.calledAfter(this.spyInit2));
      assert(this.spyExec2.calledAfter(this.spyExec1));
    });

    it('runs multiple composed generators (reverse)', async function () {
      await this.dummy.composeWith(['composed:gen2', 'composed:gen']);

      const runSpy = sinonSpy(this.dummy, 'run');
      await this.dummy.run();

      sinonAssert.callOrder(
        runSpy,
        this.spyInit2,
        this.spyInit1,
        this.spyExec,
        this.spyExec2,
        this.spyExec1,
        this.spyWrite2,
        this.spyWrite1,
        this.spyEnd2,
        this.spyEnd1,
      );
      assert(this.spyInit2.calledAfter(runSpy));
      assert(this.spyInit1.calledAfter(this.spyInit2));
      assert(this.spyExec2.calledAfter(this.spyInit1));
      assert(this.spyExec1.calledAfter(this.spyExec2));
    });

    it('runs 3 composed generators', async function () {
      this.spyExec3 = sinonSpy();
      this.spyInit3 = sinonSpy();
      const GenCompose3 = class extends Base {};
      GenCompose3.prototype.exec = this.spyExec3;
      GenCompose3.prototype.initializing = this.spyInit3;

      this.env.registerStub(GenCompose3, 'composed:gen3');

      await this.dummy.composeWith(['composed:gen', 'composed:gen2', 'composed:gen3']);

      const runSpy = sinonSpy(this.dummy, 'run');
      await this.dummy.run();

      sinonAssert.callOrder(
        runSpy,
        this.spyInit1,
        this.spyInit2,
        this.spyInit3,
        this.spyExec,
        this.spyExec1,
        this.spyExec2,
        this.spyExec3,
        this.spyWrite1,
        this.spyWrite2,
        this.spyEnd1,
        this.spyEnd2,
      );
      assert(this.spyInit1.calledAfter(runSpy));
      assert(this.spyInit2.calledAfter(this.spyInit1));
      assert(this.spyInit3.calledAfter(this.spyInit2));
      assert(this.spyExec1.calledAfter(this.spyInit3));
      assert(this.spyExec2.calledAfter(this.spyExec1));
      assert(this.spyExec3.calledAfter(this.spyExec2));
    });

    it('runs multiple composed generators inside a running generator', function (done) {
      const Dummy2 = class extends this.Dummy {};

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

      this.dummy2 = new Dummy2([], {
        resolved: 'unknown',
        namespace: 'dummy',
        env: this.env,
        'skip-install': true,
        'force-install': true,
        'skip-cache': true,
      });

      const runSpy = sinonSpy(this.dummy2, 'run');

      // I use a setTimeout here just to make sure composeWith() doesn't start the
      // generator before the base one is ran.
      setTimeout(() => {
        this.dummy2.run().then(() => {
          sinonAssert.callOrder(
            runSpy,
            writingSpy1,
            this.spyInit1,
            this.spyInit2,
            this.spyExec1,
            this.spyExec2,
            writingSpy2,
            this.spyWrite1,
            this.spyWrite2,
            endSpy,
            this.spyEnd1,
            this.spyEnd2,
          );
          assert(writingSpy1.calledAfter(runSpy));
          assert(this.spyInit1.calledAfter(writingSpy1));
          assert(this.spyInit2.calledAfter(this.spyInit1));
          assert(this.spyExec1.calledAfter(this.spyInit2));
          assert(this.spyExec2.calledAfter(this.spyExec1));
          assert(writingSpy2.calledAfter(this.spyExec2));
          assert(this.spyWrite1.calledAfter(writingSpy2));
          assert(this.spyWrite2.calledAfter(this.spyWrite1));
          assert(endSpy.calledAfter(this.spyWrite2));
          assert(this.spyEnd1.calledAfter(endSpy));
          assert(this.spyEnd2.calledAfter(this.spyEnd1));
          done();
        });
      }, 100);
    });

    it('runs multiple composed generators inside a running generator', function (done) {
      const Dummy2 = class extends this.Dummy {};

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

      this.dummy2 = new Dummy2([], {
        resolved: 'unknown',
        namespace: 'dummy',
        env: this.env,
        'skip-install': true,
        'force-install': true,
        'skip-cache': true,
      });

      const runSpy = sinonSpy(this.dummy2, 'run');

      // I use a setTimeout here just to make sure composeWith() doesn't start the
      // generator before the base one is ran.
      setTimeout(() => {
        this.dummy2.run().then(() => {
          sinonAssert.callOrder(
            runSpy,
            writingSpy1,
            this.spyInit1,
            this.spyExec1,
            writingSpy2,
            this.spyInit2,
            this.spyExec2,
            writingSpy3,
            this.spyWrite1,
            this.spyWrite2,
            endSpy,
            this.spyEnd1,
            this.spyEnd2,
          );
          assert(writingSpy1.calledAfter(runSpy));
          assert(this.spyInit1.calledAfter(writingSpy1));
          assert(this.spyExec1.calledAfter(this.spyInit1));
          assert(writingSpy2.calledAfter(this.spyExec1));
          assert(this.spyInit2.calledAfter(writingSpy2));
          assert(this.spyExec2.calledAfter(this.spyExec1));
          assert(writingSpy3.calledAfter(this.spyExec2));
          assert(this.spyWrite1.calledAfter(writingSpy3));
          assert(this.spyWrite2.calledAfter(this.spyWrite1));
          assert(endSpy.calledAfter(this.spyWrite2));
          assert(this.spyEnd1.calledAfter(endSpy));
          assert(this.spyEnd2.calledAfter(this.spyEnd1));
          done();
        });
      }, 100);
    });
  });

  it('#composeWith() inside _beforeQueue', async function () {
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

    this.env.registerStub(Generator, 'composed:gen');
    this.env.registerStub(Generator2, 'composed:gen2');
    this.env.registerStub(Generator3, 'composed:gen3');

    const dummy = new Generator([], {
      resolved: 'unknown',
      namespace: 'dummy',
      env: this.env,
      'skip-install': true,
      'force-install': true,
      'skip-cache': true,
    });

    await dummy.run();
    assert(writingSpy2.calledAfter(writingSpy1));
    assert(writingSpy3.calledAfter(writingSpy2));
  });
});
