'use strict';
const os = require('os');
const path = require('path');
const sinon = require('sinon');
const makeDir = require('make-dir');
const mockery = require('mockery');
const yeoman = require('yeoman-environment');

mockery.enable({
  warnOnReplace: false,
  warnOnUnregistered: false
});

const assert = require('yeoman-assert');
const helpers = require('yeoman-test');
const { TestAdapter } = require('yeoman-test/lib/adapter');
const Base = require('..');

const tmpdir = path.join(os.tmpdir(), 'yeoman-base');
const resolveddir = path.join(os.tmpdir(), 'yeoman-base-generator');

/* eslint-disable max-nested-callbacks */
describe('Multiples generators', () => {
  beforeEach(helpers.setUpTestDirectory(tmpdir));

  beforeEach(function() {
    this.env = yeoman.createEnv([], { 'skip-install': true }, new TestAdapter());
    makeDir.sync(resolveddir);
    this.Dummy = class extends Base {};
    this.spyExec = sinon.spy();
    this.Dummy.prototype.exec = this.spyExec;
  });

  describe('#composeWith() with multiples generators', () => {
    beforeEach(function() {
      this.dummy = new this.Dummy([], {
        resolved: 'unknown',
        namespace: 'dummy',
        env: this.env,
        'skip-install': true,
        'force-install': true,
        'skip-cache': true
      });

      this.spyExec1 = sinon.spy();
      this.spyInit1 = sinon.spy();
      this.spyWrite1 = sinon.spy();
      this.spyEnd1 = sinon.spy();

      this.GenCompose1 = class extends Base {};
      this.GenCompose1.prototype.exec = this.spyExec1;
      this.GenCompose1.prototype.initializing = this.spyInit1;
      this.GenCompose1.prototype.writing = this.spyWrite1;
      this.GenCompose1.prototype.end = this.spyEnd1;

      this.spyExec2 = sinon.spy();
      this.spyInit2 = sinon.spy();
      this.spyWrite2 = sinon.spy();
      this.spyEnd2 = sinon.spy();

      this.GenCompose2 = class extends Base {};
      this.GenCompose2.prototype.exec = this.spyExec2;
      this.GenCompose2.prototype.initializing = this.spyInit2;
      this.GenCompose2.prototype.writing = this.spyWrite2;
      this.GenCompose2.prototype.end = this.spyEnd2;

      this.env.registerStub(this.GenCompose1, 'composed:gen');
      this.env.registerStub(this.GenCompose2, 'composed:gen2');
    });

    it('runs multiple composed generators', function(done) {
      this.dummy.composeWith(['composed:gen', 'composed:gen2']);

      const runSpy = sinon.spy(this.dummy, 'run');

      // I use a setTimeout here just to make sure composeWith() doesn't start the
      // generator before the base one is ran.
      setTimeout(() => {
        this.dummy.run().then(() => {
          sinon.assert.callOrder(
            runSpy,
            this.spyInit1,
            this.spyInit2,
            this.spyExec,
            this.spyExec1,
            this.spyExec2,
            this.spyWrite1,
            this.spyWrite2,
            this.spyEnd1,
            this.spyEnd2
          );
          assert.equal(this.spyExec1.thisValues[0].options.skipInstall, true);
          assert.equal(this.spyExec1.thisValues[0].options['skip-install'], true);
          assert.equal(this.spyExec1.thisValues[0].options.forceInstall, true);
          assert.equal(this.spyExec1.thisValues[0].options['force-install'], true);
          assert.equal(this.spyExec1.thisValues[0].options.skipCache, true);
          assert.equal(this.spyExec1.thisValues[0].options['skip-cache'], true);
          assert.equal(this.spyExec2.thisValues[0].options.skipInstall, true);
          assert.equal(this.spyExec2.thisValues[0].options['skip-install'], true);
          assert.equal(this.spyExec2.thisValues[0].options.forceInstall, true);
          assert.equal(this.spyExec2.thisValues[0].options['force-install'], true);
          assert.equal(this.spyExec2.thisValues[0].options.skipCache, true);
          assert.equal(this.spyExec2.thisValues[0].options['skip-cache'], true);
          assert(this.spyInit1.calledAfter(runSpy));
          assert(this.spyInit2.calledAfter(this.spyInit1));
          assert(this.spyExec1.calledAfter(this.spyInit2));
          assert(this.spyExec2.calledAfter(this.spyExec1));
          done();
        });
      }, 100);
    });

    it('runs multiple composed generators (reverse)', function(done) {
      this.dummy.composeWith(['composed:gen2', 'composed:gen']);

      const runSpy = sinon.spy(this.dummy, 'run');

      // I use a setTimeout here just to make sure composeWith() doesn't start the
      // generator before the base one is ran.
      setTimeout(() => {
        this.dummy.run().then(() => {
          sinon.assert.callOrder(
            runSpy,
            this.spyInit2,
            this.spyInit1,
            this.spyExec,
            this.spyExec2,
            this.spyExec1,
            this.spyWrite2,
            this.spyWrite1,
            this.spyEnd2,
            this.spyEnd1
          );
          assert.equal(this.spyExec1.thisValues[0].options.skipInstall, true);
          assert.equal(this.spyExec1.thisValues[0].options['skip-install'], true);
          assert.equal(this.spyExec1.thisValues[0].options.forceInstall, true);
          assert.equal(this.spyExec1.thisValues[0].options['force-install'], true);
          assert.equal(this.spyExec1.thisValues[0].options.skipCache, true);
          assert.equal(this.spyExec1.thisValues[0].options['skip-cache'], true);
          assert.equal(this.spyExec2.thisValues[0].options.skipInstall, true);
          assert.equal(this.spyExec2.thisValues[0].options['skip-install'], true);
          assert.equal(this.spyExec2.thisValues[0].options.forceInstall, true);
          assert.equal(this.spyExec2.thisValues[0].options['force-install'], true);
          assert.equal(this.spyExec2.thisValues[0].options.skipCache, true);
          assert.equal(this.spyExec2.thisValues[0].options['skip-cache'], true);
          assert(this.spyInit2.calledAfter(runSpy));
          assert(this.spyInit1.calledAfter(this.spyInit2));
          assert(this.spyExec2.calledAfter(this.spyInit1));
          assert(this.spyExec1.calledAfter(this.spyExec2));
          done();
        });
      }, 100);
    });

    it('runs 3 composed generators', function(done) {
      this.spyExec3 = sinon.spy();
      this.spyInit3 = sinon.spy();
      const GenCompose3 = class extends Base {};
      GenCompose3.prototype.exec = this.spyExec3;
      GenCompose3.prototype.initializing = this.spyInit3;

      this.env.registerStub(GenCompose3, 'composed:gen3');

      this.dummy.composeWith(['composed:gen', 'composed:gen2', 'composed:gen3']);

      const runSpy = sinon.spy(this.dummy, 'run');

      // I use a setTimeout here just to make sure composeWith() doesn't start the
      // generator before the base one is ran.
      setTimeout(() => {
        this.dummy.run().then(() => {
          sinon.assert.callOrder(
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
            this.spyEnd2
          );
          assert.equal(this.spyExec1.thisValues[0].options.skipInstall, true);
          assert.equal(this.spyExec1.thisValues[0].options['skip-install'], true);
          assert.equal(this.spyExec1.thisValues[0].options.forceInstall, true);
          assert.equal(this.spyExec1.thisValues[0].options['force-install'], true);
          assert.equal(this.spyExec1.thisValues[0].options.skipCache, true);
          assert.equal(this.spyExec1.thisValues[0].options['skip-cache'], true);
          assert.equal(this.spyExec2.thisValues[0].options.skipInstall, true);
          assert.equal(this.spyExec2.thisValues[0].options['skip-install'], true);
          assert.equal(this.spyExec2.thisValues[0].options.forceInstall, true);
          assert.equal(this.spyExec2.thisValues[0].options['force-install'], true);
          assert.equal(this.spyExec2.thisValues[0].options.skipCache, true);
          assert.equal(this.spyExec2.thisValues[0].options['skip-cache'], true);
          assert.equal(this.spyExec3.thisValues[0].options.skipInstall, true);
          assert.equal(this.spyExec3.thisValues[0].options['skip-install'], true);
          assert.equal(this.spyExec3.thisValues[0].options.forceInstall, true);
          assert.equal(this.spyExec3.thisValues[0].options['force-install'], true);
          assert.equal(this.spyExec3.thisValues[0].options.skipCache, true);
          assert.equal(this.spyExec3.thisValues[0].options['skip-cache'], true);
          assert(this.spyInit1.calledAfter(runSpy));
          assert(this.spyInit2.calledAfter(this.spyInit1));
          assert(this.spyInit3.calledAfter(this.spyInit2));
          assert(this.spyExec1.calledAfter(this.spyInit3));
          assert(this.spyExec2.calledAfter(this.spyExec1));
          assert(this.spyExec3.calledAfter(this.spyExec2));
          done();
        });
      }, 100);
    });

    it('runs multiple composed generators inside a running generator', function(done) {
      const Dummy2 = class extends this.Dummy {};

      const writingSpy1 = sinon.spy();
      const writingSpy2 = sinon.spy();
      const endSpy = sinon.spy();
      Dummy2.prototype.end = endSpy;

      Dummy2.prototype.writing = {
        compose: function() {
          // Initializing and default is queue and called next (before writingSpy2)
          // Writing is queue after already queued functions (after writingSpy2)
          this.composeWith(['composed:gen', 'composed:gen2']);
          writingSpy1();
        },
        writingSpy2: function() {
          writingSpy2();
        }
      };

      this.dummy2 = new Dummy2([], {
        resolved: 'unknown',
        namespace: 'dummy',
        env: this.env,
        'skip-install': true,
        'force-install': true,
        'skip-cache': true
      });

      const runSpy = sinon.spy(this.dummy2, 'run');

      // I use a setTimeout here just to make sure composeWith() doesn't start the
      // generator before the base one is ran.
      setTimeout(() => {
        this.dummy2.run().then(() => {
          sinon.assert.callOrder(
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
            this.spyEnd2
          );
          assert.equal(this.spyExec1.thisValues[0].options.skipInstall, true);
          assert.equal(this.spyExec1.thisValues[0].options['skip-install'], true);
          assert.equal(this.spyExec1.thisValues[0].options.forceInstall, true);
          assert.equal(this.spyExec1.thisValues[0].options['force-install'], true);
          assert.equal(this.spyExec1.thisValues[0].options.skipCache, true);
          assert.equal(this.spyExec1.thisValues[0].options['skip-cache'], true);
          assert.equal(this.spyExec2.thisValues[0].options.skipInstall, true);
          assert.equal(this.spyExec2.thisValues[0].options['skip-install'], true);
          assert.equal(this.spyExec2.thisValues[0].options.forceInstall, true);
          assert.equal(this.spyExec2.thisValues[0].options['force-install'], true);
          assert.equal(this.spyExec2.thisValues[0].options.skipCache, true);
          assert.equal(this.spyExec2.thisValues[0].options['skip-cache'], true);
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

    it('runs multiple composed generators inside a running generator', function(done) {
      const Dummy2 = class extends this.Dummy {};

      const writingSpy1 = sinon.spy();
      const writingSpy2 = sinon.spy();
      const writingSpy3 = sinon.spy();
      const endSpy = sinon.spy();

      Dummy2.prototype.end = endSpy;
      Dummy2.prototype.writing = {
        compose1: function() {
          // Initializing and default is queue and called next (before writingSpy2)
          // Writing is queue after already queued functions (after writingSpy2, compose2, writingSpy3)
          this.composeWith('composed:gen');
          writingSpy1();
        },
        writingSpy2: function() {
          writingSpy2();
        },
        compose2: function() {
          this.composeWith('composed:gen2');
        },
        writingSpy3: function() {
          writingSpy3();
        }
      };

      this.dummy2 = new Dummy2([], {
        resolved: 'unknown',
        namespace: 'dummy',
        env: this.env,
        'skip-install': true,
        'force-install': true,
        'skip-cache': true
      });

      const runSpy = sinon.spy(this.dummy2, 'run');

      // I use a setTimeout here just to make sure composeWith() doesn't start the
      // generator before the base one is ran.
      setTimeout(() => {
        this.dummy2.run().then(() => {
          sinon.assert.callOrder(
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
            this.spyEnd2
          );
          assert.equal(this.spyExec1.thisValues[0].options.skipInstall, true);
          assert.equal(this.spyExec1.thisValues[0].options['skip-install'], true);
          assert.equal(this.spyExec1.thisValues[0].options.forceInstall, true);
          assert.equal(this.spyExec1.thisValues[0].options['force-install'], true);
          assert.equal(this.spyExec1.thisValues[0].options.skipCache, true);
          assert.equal(this.spyExec1.thisValues[0].options['skip-cache'], true);
          assert.equal(this.spyExec2.thisValues[0].options.skipInstall, true);
          assert.equal(this.spyExec2.thisValues[0].options['skip-install'], true);
          assert.equal(this.spyExec2.thisValues[0].options.forceInstall, true);
          assert.equal(this.spyExec2.thisValues[0].options['force-install'], true);
          assert.equal(this.spyExec2.thisValues[0].options.skipCache, true);
          assert.equal(this.spyExec2.thisValues[0].options['skip-cache'], true);
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

  it('#composeWith() inside contructor', function(done) {
    const Generator = class extends Base {
      constructor(args, opts) {
        super(args, opts);
        this.composeWith('composed:gen2');
      }
    };
    const writingSpy1 = sinon.spy();
    Generator.prototype.writing = {
      compose1: function() {
        writingSpy1();
      }
    };

    const Generator2 = class extends Base {
      constructor(args, opts) {
        super(args, opts);
        this.composeWith('composed:gen3');
      }
    };
    const writingSpy2 = sinon.spy();
    Generator2.prototype.writing = {
      compose2: function() {
        writingSpy2();
      }
    };

    const Generator3 = class extends Base {};
    const writingSpy3 = sinon.spy();
    Generator3.prototype.writing = {
      compose3: function() {
        writingSpy3();
      }
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
      'skip-cache': true
    });

    dummy.run().then(() => {
      assert(writingSpy2.calledAfter(writingSpy1));
      assert(writingSpy3.calledAfter(writingSpy2));
      done();
    });
  });
});
