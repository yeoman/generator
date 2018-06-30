'use strict';
const yeoman = require('yeoman-environment');
const sinon = require('sinon');
const { TestAdapter } = require('yeoman-test/lib/adapter');
const Base = require('..');
const chalk = require('chalk');

const asyncStub = {
  on(key, cb) {
    if (key === 'exit') {
      cb();
    }

    return asyncStub;
  }
};

describe('Base (actions/install mixin)', () => {
  beforeEach(() => {
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

  describe('#scheduleInstallTask()', () => {
    it('takes a config object and passes it to the spawned process', done => {
      const options = {
        save: true
      };
      const spawnEnv = {
        env: {
          PATH: '/path/to/bin'
        }
      };

      // Args: installer, paths, options, cb
      this.dummy.scheduleInstallTask(
        'nestedScript',
        ['path1', 'path2'],
        options,
        spawnEnv
      );
      this.dummy.run(() => {
        sinon.assert.calledWithExactly(
          this.spawnCommandStub,
          'nestedScript',
          ['install', 'path1', 'path2', '--save'],
          spawnEnv
        );
        done();
      });
    });

    describe('with --skip-install', () => {
      beforeEach(() => {
        this.dummy = this.env.create('dummy', {
          options: {
            skipInstall: true
          }
        });
      });

      it('does not spawn anything with skipInstall', done => {
        this.dummy.scheduleInstallTask('npm', ['install']);
        this.dummy.run(() => {
          sinon.assert.notCalled(this.spawnCommandStub);
          done();
        });
      });

      it('does not spawn anything with skipInstall', done => {
        this.dummy.scheduleInstallTask('yarn', ['install']);
        this.dummy.run(() => {
          sinon.assert.notCalled(this.spawnCommandStub);
          done();
        });
      });

      it('logs the skipped install command', done => {
        this.dummy.scheduleInstallTask('npm', ['some-package'], { save: true });
        this.dummy.run(() => {
          sinon.assert.calledWith(
            this.dummy.log.invoke,
            this.dummy.log.prototype.constructor,
            this.dummy,
            [
              'Skipping install command: ' +
                chalk.yellow('npm install some-package --save --cache-min 86400')
            ]
          );
          done();
        });
      });
    });
  });

  describe('#bowerInstall()', () => {
    it('spawn a bower process once per commands', done => {
      this.dummy.bowerInstall();
      this.dummy.bowerInstall();
      this.dummy.run(() => {
        sinon.assert.calledOnce(this.spawnCommandStub);
        sinon.assert.calledWithExactly(this.spawnCommandStub, 'bower', ['install'], {});
        done();
      });
    });

    it('spawn a bower process with formatted options', done => {
      this.dummy.bowerInstall('jquery', { saveDev: true });
      this.dummy.run(() => {
        sinon.assert.calledOnce(this.spawnCommandStub);
        sinon.assert.calledWithExactly(
          this.spawnCommandStub,
          'bower',
          ['install', 'jquery', '--save-dev'],
          {}
        );
        done();
      });
    });
  });

  describe('#npmInstall()', () => {
    it('spawn an install process once per commands', done => {
      this.dummy.npmInstall();
      this.dummy.npmInstall();
      this.dummy.run(() => {
        sinon.assert.calledOnce(this.spawnCommandStub);
        sinon.assert.calledWithExactly(
          this.spawnCommandStub,
          'npm',
          ['install', '--cache-min', 86400],
          {}
        );
        done();
      });
    });

    it('run with options', done => {
      this.dummy.npmInstall('yo', { save: true });
      this.dummy.run(() => {
        sinon.assert.calledWithExactly(
          this.spawnCommandStub,
          'npm',
          ['install', 'yo', '--save', '--cache-min', 86400],
          {}
        );
        done();
      });
    });
  });

  describe('#yarnInstall()', () => {
    it('spawn an install process once per commands', done => {
      this.dummy.yarnInstall();
      this.dummy.yarnInstall();
      this.dummy.run(() => {
        sinon.assert.calledOnce(this.spawnCommandStub);
        sinon.assert.calledWithExactly(this.spawnCommandStub, 'yarn', ['install'], {});
        done();
      });
    });

    it('run with options', done => {
      this.dummy.yarnInstall('yo', { dev: true });
      this.dummy.run(() => {
        sinon.assert.calledOnce(this.spawnCommandStub);
        sinon.assert.calledWithExactly(
          this.spawnCommandStub,
          'yarn',
          ['add', 'yo', '--dev'],
          {}
        );
        done();
      });
    });
  });

  describe('#installDependencies()', () => {
    it('spawn npm and bower', done => {
      this.dummy.installDependencies();
      this.dummy.run(() => {
        sinon.assert.calledTwice(this.spawnCommandStub);
        sinon.assert.calledWithExactly(this.spawnCommandStub, 'bower', ['install'], {});
        sinon.assert.calledWithExactly(
          this.spawnCommandStub,
          'npm',
          ['install', '--cache-min', 86400],
          {}
        );
        done();
      });
    });

    it('spawn yarn', done => {
      this.dummy.installDependencies({ yarn: true, npm: false });
      this.dummy.run(() => {
        sinon.assert.calledTwice(this.spawnCommandStub);
        sinon.assert.calledWithExactly(this.spawnCommandStub, 'bower', ['install'], {});
        sinon.assert.calledWithExactly(this.spawnCommandStub, 'yarn', ['install'], {});
        done();
      });
    });

    it('spawn yarn and bower with options', done => {
      this.dummy.installDependencies({
        yarn: { force: true },
        bower: { depth: 0 },
        npm: false
      });
      this.dummy.run(() => {
        sinon.assert.calledTwice(this.spawnCommandStub);
        sinon.assert.calledWithExactly(
          this.spawnCommandStub,
          'bower',
          ['install', '--depth=0'],
          {}
        );
        sinon.assert.calledWithExactly(
          this.spawnCommandStub,
          'yarn',
          ['install', '--force'],
          {}
        );
        done();
      });
    });
  });
});
