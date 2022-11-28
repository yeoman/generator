import yeoman from 'yeoman-environment';
import sinon from 'sinon';
import assert from 'yeoman-assert';
import chalk from 'chalk';
import _ from 'lodash';

import {TestAdapter} from 'yeoman-test/lib/adapter.js';
import Base from '../src/generator.js';
import installAction from '../src/actions/install.js';

_.extend(Base.prototype, installAction);

const asyncStub = {
  on(key, cb) {
    if (key === 'exit') {
      cb();
    }

    return asyncStub;
  },
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

  describe('#scheduleInstallTask()', () => {
    it('takes a config object and passes it to the spawned process', function (done) {
      const options = {
        save: true,
      };
      const spawnEnv = {
        env: {
          PATH: '/path/to/bin',
        },
      };

      // Args: installer, paths, options, cb
      this.dummy.scheduleInstallTask(
        'nestedScript',
        ['path1', 'path2'],
        options,
        spawnEnv,
      );
      this.dummy.run().then(() => {
        sinon.assert.calledWithExactly(
          this.spawnCommandStub,
          'nestedScript',
          ['install', 'path1', 'path2', '--save'],
          spawnEnv,
        );
        done();
      });
    });

    describe('without --force-install', () => {
      beforeEach(function () {
        this.dummy = this.env.create('dummy', {});
        this.spawnCommandStub = sinon.stub(this.dummy, 'spawnCommand');
      });

      it('should not fail on bad exit code without forceInstall', function (done) {
        const asyncStub = {
          on(key, cb) {
            if (key === 'exit') {
              cb(1);
            }

            return asyncStub;
          },
        };
        this.spawnCommandStub.returns(asyncStub);
        this.dummy.scheduleInstallTask('npm', ['install']);
        this.dummy.run().then(() => {
          sinon.assert.calledOnce(this.spawnCommandStub);
          done();
        });
      });

      it('should not fail on exit signal without forceInstall', function (done) {
        const asyncStub = {
          on(key, cb) {
            if (key === 'exit') {
              cb(undefined, 'SIGKILL');
            }

            return asyncStub;
          },
        };
        this.spawnCommandStub.returns(asyncStub);
        this.dummy.scheduleInstallTask('npm', ['install']);
        this.dummy.run().then(() => {
          sinon.assert.calledOnce(this.spawnCommandStub);
          done();
        });
      });

      it('should not fail on error without forceInstall', function (done) {
        const asyncStub = {
          on(key, cb) {
            if (key === 'error') {
              cb(new Error('Process not found'));
            }

            return asyncStub;
          },
        };
        this.spawnCommandStub.returns(asyncStub);
        this.dummy.scheduleInstallTask('npm', ['install']);
        this.dummy.run().then(() => {
          sinon.assert.calledOnce(this.spawnCommandStub);
          done();
        });
      });
    });

    describe('with --force-install', () => {
      beforeEach(function () {
        this.dummy = this.env.create('dummy', {
          args: ['--force-install'],
        });
        this.spawnCommandStub = sinon.stub(this.dummy, 'spawnCommand');
      });

      it('fails on bad exit code with forceInstall', function (done) {
        const asyncStub = {
          on(key, cb) {
            if (key === 'exit') {
              cb(1);
            }

            return asyncStub;
          },
        };
        this.spawnCommandStub.returns(asyncStub);
        this.dummy.scheduleInstallTask('npm', ['install']);
        this.dummy.on('error', (error) => {
          sinon.assert.calledOnce(this.spawnCommandStub);
          assert(error instanceof Error);
          assert.equal(error.message, 'Installation of npm failed with code 1');
          done();
        });
        this.dummy.run();
      });

      it('fails on exit signal with forceInstall', function (done) {
        const asyncStub = {
          on(key, cb) {
            if (key === 'exit') {
              cb(undefined, 'SIGKILL');
            }

            return asyncStub;
          },
        };
        this.spawnCommandStub.returns(asyncStub);
        this.dummy.scheduleInstallTask('npm', ['install']);
        this.dummy.on('error', (error) => {
          sinon.assert.calledOnce(this.spawnCommandStub);
          assert(error instanceof Error);
          assert.equal(
            error.message,
            'Installation of npm failed with code SIGKILL',
          );
          done();
        });
        this.dummy.run();
      });

      it('fails on error with forceInstall', function (done) {
        const asyncStub = {
          on(key, cb) {
            if (key === 'error') {
              cb(new Error('Process not found'));
            }

            return asyncStub;
          },
        };
        this.spawnCommandStub.returns(asyncStub);
        this.dummy.scheduleInstallTask('npm', ['install']);
        this.dummy.on('error', (error) => {
          sinon.assert.calledOnce(this.spawnCommandStub);
          assert(error instanceof Error);
          assert.equal(error.message, 'Process not found');
          done();
        });
        this.dummy.run();
      });
    });

    describe('with --skip-install', () => {
      beforeEach(function () {
        this.dummy = this.env.create('dummy', {
          args: ['--skip-install'],
        });
      });

      it('does not spawn anything with skipInstall', function (done) {
        this.dummy.scheduleInstallTask('npm', ['install']);
        this.dummy.run().then(() => {
          sinon.assert.notCalled(this.spawnCommandStub);
          done();
        });
      });

      it('does not spawn anything with skipInstall', function (done) {
        this.dummy.scheduleInstallTask('yarn', ['install']);
        this.dummy.run().then(() => {
          sinon.assert.notCalled(this.spawnCommandStub);
          done();
        });
      });

      it('logs the skipped install command', function (done) {
        this.dummy.scheduleInstallTask('npm', ['some-package'], {save: true});
        this.dummy.run().then(() => {
          sinon.assert.calledWith(
            this.dummy.log.invoke,
            this.dummy.log.prototype.constructor,
            this.dummy,
            [
              'Skipping install command: ' +
                chalk.yellow(
                  'npm install some-package --save --cache-min 86400',
                ),
            ],
          );
          done();
        });
      });
    });
  });

  describe('#bowerInstall()', () => {
    it('spawn a bower process once per commands', function (done) {
      this.dummy.bowerInstall();
      this.dummy.bowerInstall();
      this.dummy.run().then(() => {
        sinon.assert.calledOnce(this.spawnCommandStub);
        sinon.assert.calledWithExactly(
          this.spawnCommandStub,
          'bower',
          ['install'],
          {},
        );
        done();
      });
    });

    it('spawn a bower process with formatted options', function (done) {
      this.dummy.bowerInstall('jquery', {saveDev: true});
      this.dummy.run().then(() => {
        sinon.assert.calledOnce(this.spawnCommandStub);
        sinon.assert.calledWithExactly(
          this.spawnCommandStub,
          'bower',
          ['install', 'jquery', '--save-dev'],
          {},
        );
        done();
      });
    });
  });

  describe('#npmInstall()', () => {
    it('spawn an install process once per commands', function (done) {
      this.dummy.npmInstall();
      this.dummy.npmInstall();
      this.dummy.run().then(() => {
        sinon.assert.calledOnce(this.spawnCommandStub);
        sinon.assert.calledWithExactly(
          this.spawnCommandStub,
          'npm',
          ['install', '--cache-min', 86_400],
          {},
        );
        done();
      });
    });

    it('run with options', function (done) {
      this.dummy.npmInstall('yo', {save: true});
      this.dummy.run().then(() => {
        sinon.assert.calledWithExactly(
          this.spawnCommandStub,
          'npm',
          ['install', 'yo', '--save', '--cache-min', 86_400],
          {},
        );
        done();
      });
    });

    it('spawn separate install processes if spawnOptions differs', function (done) {
      this.dummy.npmInstall(null, null, {cwd: 'path1'});
      this.dummy.npmInstall(null, null, {cwd: 'path2'});
      this.dummy.run().then(() => {
        sinon.assert.calledTwice(this.spawnCommandStub);
        done();
      });
    });
  });

  describe('#yarnInstall()', () => {
    it('spawn an install process once per commands', function (done) {
      this.dummy.yarnInstall();
      this.dummy.yarnInstall();
      this.dummy.run().then(() => {
        sinon.assert.calledOnce(this.spawnCommandStub);
        sinon.assert.calledWithExactly(
          this.spawnCommandStub,
          'yarn',
          ['install'],
          {},
        );
        done();
      });
    });

    it('run with options', function (done) {
      this.dummy.yarnInstall('yo', {dev: true});
      this.dummy.run().then(() => {
        sinon.assert.calledOnce(this.spawnCommandStub);
        sinon.assert.calledWithExactly(
          this.spawnCommandStub,
          'yarn',
          ['add', 'yo', '--dev'],
          {},
        );
        done();
      });
    });

    it('spawn separate install processes if spawnOptions differs', function (done) {
      this.dummy.yarnInstall(null, null, {cwd: 'path1'});
      this.dummy.yarnInstall(null, null, {cwd: 'path2'});
      this.dummy.run().then(() => {
        sinon.assert.calledTwice(this.spawnCommandStub);
        done();
      });
    });
  });

  describe('#installDependencies()', () => {
    it('spawn npm and bower', function (done) {
      this.dummy.installDependencies({bower: true});
      this.dummy.run().then(() => {
        sinon.assert.calledTwice(this.spawnCommandStub);
        sinon.assert.calledWithExactly(
          this.spawnCommandStub,
          'bower',
          ['install'],
          {},
        );
        sinon.assert.calledWithExactly(
          this.spawnCommandStub,
          'npm',
          ['install', '--cache-min', 86_400],
          {},
        );
        done();
      });
    });

    it('spawn yarn', function (done) {
      this.dummy.installDependencies({yarn: true, npm: false, bower: true});
      this.dummy.run().then(() => {
        sinon.assert.calledTwice(this.spawnCommandStub);
        sinon.assert.calledWithExactly(
          this.spawnCommandStub,
          'bower',
          ['install'],
          {},
        );
        sinon.assert.calledWithExactly(
          this.spawnCommandStub,
          'yarn',
          ['install'],
          {},
        );
        done();
      });
    });

    it('spawn yarn and bower with options', function (done) {
      this.dummy.installDependencies({
        yarn: {force: true},
        bower: {depth: 0},
        npm: false,
      });
      this.dummy.run().then(() => {
        sinon.assert.calledTwice(this.spawnCommandStub);
        sinon.assert.calledWithExactly(
          this.spawnCommandStub,
          'bower',
          ['install', '--depth=0'],
          {},
        );
        sinon.assert.calledWithExactly(
          this.spawnCommandStub,
          'yarn',
          ['install', '--force'],
          {},
        );
        done();
      });
    });
  });
});
