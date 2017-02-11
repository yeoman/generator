'use strict';
const yeoman = require('yeoman-environment');
const sinon = require('sinon');
const TestAdapter = require('yeoman-test/lib/adapter').TestAdapter;
const Base = require('..');

const asyncStub = {
  on(key, cb) {
    if (key === 'exit') {
      cb();
    }

    return asyncStub;
  }
};

describe('Base (actions/install mixin)', () => {
  beforeEach(function () {
    this.env = yeoman.createEnv([], {}, new TestAdapter());
    const Dummy = Base.extend({
      exec() {}
    });
    this.env.registerStub(Dummy, 'dummy');
    this.dummy = this.env.create('dummy');

    // Keep track of all commands executed by spawnCommand.
    this.spawnCommandStub = sinon.stub(this.dummy, 'spawnCommand');
    this.spawnCommandStub.returns(asyncStub);
  });

  describe('#runInstall()', () => {
    it('takes a config object and passes it to the spawned process', function (done) {
      const callbackSpy = sinon.spy();
      const options = {
        save: true
      };
      const spawnEnv = {
        env: {
          PATH: '/path/to/bin'
        }
      };

      // Args: installer, paths, options, cb
      this.dummy.runInstall('nestedScript', ['path1', 'path2'], options, callbackSpy, spawnEnv);
      this.dummy.run(() => {
        sinon.assert.calledWithExactly(
          this.spawnCommandStub,
          'nestedScript',
          ['install', 'path1', 'path2', '--save'],
          spawnEnv
        );

        sinon.assert.calledOnce(callbackSpy);
        done();
      });
    });

    describe('with --skip-install', () => {
      beforeEach(function () {
        this.dummy = this.env.create('dummy', {
          options: {
            skipInstall: true
          }
        });
      });

      it('does not spawn anything with skipInstall', function (done) {
        this.dummy.runInstall('npm', ['install']);
        this.dummy.run(() => {
          sinon.assert.notCalled(this.spawnCommandStub);
          done();
        });
      });

      it('does not spawn anything with skipInstall', function (done) {
        this.dummy.runInstall('yarn', ['install']);
        this.dummy.run(() => {
          sinon.assert.notCalled(this.spawnCommandStub);
          done();
        });
      });

      it('call callback if skipInstall', function (done) {
        const spy = sinon.spy();
        this.dummy.runInstall('npm', ['install'], spy);
        this.dummy.run(() => {
          sinon.assert.calledOnce(spy);
          done();
        });
      });

      it('call callback if skipInstall', function (done) {
        const spy = sinon.spy();
        this.dummy.runInstall('yarn', ['install'], spy);
        this.dummy.run(() => {
          sinon.assert.calledOnce(spy);
          done();
        });
      });
    });
  });

  describe('#bowerInstall()', () => {
    it('spawn a bower process once per commands', function (done) {
      this.dummy.bowerInstall();
      this.dummy.bowerInstall();
      this.dummy.run(() => {
        sinon.assert.calledOnce(this.spawnCommandStub);
        sinon.assert.calledWithExactly(this.spawnCommandStub, 'bower', ['install'], {});
        done();
      });
    });

    it('spawn a bower process with formatted options', function (done) {
      this.dummy.bowerInstall('jquery', {saveDev: true}, () => {
        sinon.assert.calledOnce(this.spawnCommandStub);
        sinon.assert.calledWithExactly(
          this.spawnCommandStub,
          'bower',
          ['install', 'jquery', '--save-dev'],
          {}
        );

        done();
      });
      this.dummy.run();
    });
  });

  describe('#npmInstall()', () => {
    it('spawn an install process once per commands', function (done) {
      this.dummy.npmInstall();
      this.dummy.npmInstall();
      this.dummy.run(() => {
        sinon.assert.calledOnce(this.spawnCommandStub);
        sinon.assert.calledWithExactly(this.spawnCommandStub, 'npm', ['install', '--cache-min', 86400], {});
        done();
      });
    });

    it('run without callback', function (done) {
      this.dummy.npmInstall('yo', {save: true});
      this.dummy.run(() => {
        sinon.assert.calledOnce(this.spawnCommandStub);
        done();
      });
    });

    it('run with callback', function (done) {
      this.dummy.npmInstall('yo', {save: true}, () => {
        sinon.assert.calledOnce(this.spawnCommandStub);
        done();
      });
      this.dummy.run();
    });
  });

  describe('#yarnInstall()', () => {
    it('spawn an install process once per commands', function (done) {
      this.dummy.yarnInstall();
      this.dummy.yarnInstall();
      this.dummy.run(() => {
        sinon.assert.calledOnce(this.spawnCommandStub);
        sinon.assert.calledWithExactly(this.spawnCommandStub, 'yarn', ['install'], {});
        done();
      });
    });

    it('run without callback', function (done) {
      this.dummy.yarnInstall('yo', {dev: true});
      this.dummy.run(() => {
        sinon.assert.calledOnce(this.spawnCommandStub);
        sinon.assert.calledWithExactly(this.spawnCommandStub, 'yarn', ['add', 'yo', '--dev'], {});
        done();
      });
    });

    it('run with callback', function (done) {
      this.dummy.yarnInstall('yo', () => {
        sinon.assert.calledOnce(this.spawnCommandStub);
        sinon.assert.calledWithExactly(this.spawnCommandStub, 'yarn', ['add', 'yo'], {});
        done();
      });
      this.dummy.run();
    });
  });

  describe('#installDependencies()', () => {
    it('spawn npm and bower', function (done) {
      this.dummy.installDependencies(() => {
        sinon.assert.calledTwice(this.spawnCommandStub);
        sinon.assert.calledWithExactly(this.spawnCommandStub, 'bower', ['install'], {});
        sinon.assert.calledWithExactly(this.spawnCommandStub, 'npm', ['install', '--cache-min', 86400], {});
        done();
      });
      this.dummy.run();
    });

    it('execute a callback after installs', function (done) {
      this.dummy.installDependencies({callback: done});
      this.dummy.run();
    });

    it('spawn yarn', function (done) {
      this.dummy.installDependencies({yarn: true, npm: false, callback: function () {
        sinon.assert.calledTwice(this.spawnCommandStub);
        sinon.assert.calledWithExactly(this.spawnCommandStub, 'bower', ['install'], {});
        sinon.assert.calledWithExactly(this.spawnCommandStub, 'yarn', ['install'], {});
        done();
      }.bind(this)});
      this.dummy.run();
    });
  });
});
