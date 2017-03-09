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
    const Dummy = class extends Base {
      exec() {}
    };
    this.env.registerStub(Dummy, 'dummy');
    this.dummy = this.env.create('dummy');

    // Keep track of all commands executed by spawnCommand.
    this.spawnCommandStub = sinon.stub(this.dummy, 'spawnCommand');
    this.spawnCommandStub.returns(asyncStub);
  });

  describe('#runInstall()', () => {
    it('takes a config object and passes it to the spawned process', function () {
      const options = {
        save: true
      };
      const spawnEnv = {
        env: {
          PATH: '/path/to/bin'
        }
      };

      // Args: installer, paths, options, cb
      const promise = this.dummy
        .runInstall('nestedScript', ['path1', 'path2'], options, spawnEnv)
        .then(() => {
          sinon.assert.calledWithExactly(
            this.spawnCommandStub,
            'nestedScript',
            ['install', 'path1', 'path2', '--save'],
            spawnEnv
          );
        });
      this.dummy.run();
      return promise;
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

      it('resolve Promise if skipInstall', function () {
        const promise = this.dummy.runInstall('npm', ['install']);
        this.dummy.run();
        return promise;
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

    it('spawn a bower process with formatted options', function () {
      const promise = this.dummy.bowerInstall('jquery', {saveDev: true}).then(() => {
        sinon.assert.calledOnce(this.spawnCommandStub);
        sinon.assert.calledWithExactly(
          this.spawnCommandStub,
          'bower',
          ['install', 'jquery', '--save-dev'],
          {}
        );
      });
      this.dummy.run();
      return promise;
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

    it('run with options', function (done) {
      this.dummy.npmInstall('yo', {save: true});
      this.dummy.run(() => {
        sinon.assert.calledWithExactly(this.spawnCommandStub, 'npm', ['install', 'yo', '--save', '--cache-min', 86400], {});
        done();
      });
    });

    it('resolve Promise on success', function () {
      const promise = this.dummy.npmInstall('yo').then(() => {
        sinon.assert.calledOnce(this.spawnCommandStub);
      });
      this.dummy.run();
      return promise;
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

    it('run with options', function (done) {
      this.dummy.yarnInstall('yo', {dev: true});
      this.dummy.run(() => {
        sinon.assert.calledOnce(this.spawnCommandStub);
        sinon.assert.calledWithExactly(this.spawnCommandStub, 'yarn', ['add', 'yo', '--dev'], {});
        done();
      });
    });

    it('resolve promise on success', function () {
      const promise = this.dummy.yarnInstall('yo').then(() => {
        sinon.assert.calledOnce(this.spawnCommandStub);
        sinon.assert.calledWithExactly(this.spawnCommandStub, 'yarn', ['add', 'yo'], {});
      });
      this.dummy.run();
      return promise;
    });
  });

  describe('#installDependencies()', () => {
    it('spawn npm and bower', function () {
      const promise = this.dummy.installDependencies().then(() => {
        sinon.assert.calledTwice(this.spawnCommandStub);
        sinon.assert.calledWithExactly(this.spawnCommandStub, 'bower', ['install'], {});
        sinon.assert.calledWithExactly(this.spawnCommandStub, 'npm', ['install', '--cache-min', 86400], {});
      });
      this.dummy.run();
      return promise;
    });

    it('spawn yarn', function () {
      const promise = this.dummy.installDependencies({yarn: true, npm: false}).then(() => {
        sinon.assert.calledTwice(this.spawnCommandStub);
        sinon.assert.calledWithExactly(this.spawnCommandStub, 'bower', ['install'], {});
        sinon.assert.calledWithExactly(this.spawnCommandStub, 'yarn', ['install'], {});
      });
      this.dummy.run();
      return promise;
    });
  });
});
