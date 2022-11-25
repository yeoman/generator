import os from 'os';
import path from 'path';
import sinon from 'sinon';
import Environment from 'yeoman-environment';
import assert from 'assert';
import helpers from 'yeoman-test';
import {TestAdapter} from 'yeoman-test/lib/adapter.js';

import Base from '../lib/index.js';

const tmpdir = path.join(os.tmpdir(), 'yeoman-generator-environment');
const REQUIRED_ENVIROMENT = '3.12.1';

/* eslint-disable max-nested-callbacks */
describe('Generator with environment version', () => {
  before(helpers.setUpTestDirectory(tmpdir));
  describe('mocked 3.0.0', () => {
    before(function () {
      this.timeout(100000);
      this.env = Environment.createEnv(
        [],
        {'skip-install': true},
        new TestAdapter()
      );
      this.env.getVersion = this.env.getVersion || (() => {});
      this.getVersionStub = sinon.stub(this.env, 'getVersion');

      this.Dummy = class extends Base {};
      this.dummy = new this.Dummy(['bar', 'baz', 'bom'], {
        foo: false,
        something: 'else',
        namespace: 'dummy',
        env: this.env,
        'skip-install': true,
        skipCheckEnv: true
      });
    });

    after(function () {
      this.getVersionStub.restore();
    });

    describe('#checkEnvironmentVersion', () => {
      describe('without args', () => {
        it('returns true', function () {
          this.getVersionStub.returns('3.0.0');
          assert.equal(this.dummy.checkEnvironmentVersion(), true);
        });
      });

      describe('with required environment', () => {
        before(function () {
          this.getVersionStub.returns('3.0.1');
        });

        it('returns true', function () {
          assert.equal(this.dummy.checkEnvironmentVersion('3.0.1'), true);
        });

        describe('with ignoreVersionCheck', () => {
          before(function () {
            this.dummy.options.ignoreVersionCheck = true;
          });

          after(function () {
            this.dummy.options.ignoreVersionCheck = false;
          });

          it('returns true', function () {
            this.getVersionStub.returns('3.0.1');
            assert.equal(this.dummy.checkEnvironmentVersion('3.0.1'), true);
          });
        });
      });

      describe('with greater than required environment', () => {
        it('returns true', function () {
          this.getVersionStub.returns('3.0.2');
          assert.equal(this.dummy.checkEnvironmentVersion('3.0.1'), true);
        });
      });

      describe('with less than required environment', () => {
        before(function () {
          this.getVersionStub.returns('3.0.0');
        });

        it('should throw', function () {
          assert.throws(
            () => this.dummy.checkEnvironmentVersion('3.0.1'),
            /requires yeoman-environment at least 3.0.1, current version is 3.0.0/
          );
        });

        describe('with warning', () => {
          it('should return false', function () {
            assert.equal(
              this.dummy.checkEnvironmentVersion('3.0.1', true),
              false
            );
          });
        });

        describe('with ignoreVersionCheck', () => {
          before(function () {
            this.dummy.options.ignoreVersionCheck = true;
          });

          after(function () {
            this.dummy.options.ignoreVersionCheck = false;
          });

          it('returns false', function () {
            assert.equal(this.dummy.checkEnvironmentVersion('3.0.1'), false);
          });
        });
      });

      describe('with required inquirer', () => {
        it('returns true', function () {
          this.getVersionStub.withArgs('inquirer').returns('7.1.0');
          assert.equal(
            this.dummy.checkEnvironmentVersion('inquirer', '7.1.0'),
            true
          );
        });
      });

      describe('with greater than required inquirer', () => {
        it('returns true', function () {
          this.getVersionStub.withArgs('inquirer').returns('7.1.1');
          assert.equal(
            this.dummy.checkEnvironmentVersion('inquirer', '7.1.0'),
            true
          );
        });
      });

      describe('with less than required inquirer', () => {
        before(function () {
          this.getVersionStub.withArgs('inquirer').returns('7.1.0');
        });

        it('throws exception', function () {
          assert.throws(
            () => this.dummy.checkEnvironmentVersion('inquirer', '7.1.1'),
            /requires inquirer at least 7.1.1, current version is 7.1.0/
          );
        });

        describe('with warning', () => {
          it('returns false', function () {
            assert.equal(
              this.dummy.checkEnvironmentVersion('inquirer', '7.1.1', true),
              false
            );
          });
        });

        describe('with ignoreVersionCheck', () => {
          before(function () {
            this.dummy.options.ignoreVersionCheck = true;
          });

          after(function () {
            this.dummy.options.ignoreVersionCheck = false;
          });

          it('returns false', function () {
            assert.equal(
              this.dummy.checkEnvironmentVersion('inquirer', '7.1.1'),
              false
            );
          });
        });
      });
    });

    describe('#prompt with storage', () => {
      it('with incompatible inquirer', function () {
        this.getVersionStub.withArgs().returns('3.0.0');
        this.getVersionStub.withArgs('inquirer').returns('7.0.0');
        assert.throws(
          () => this.dummy.prompt([], this.dummy.config),
          /requires inquirer at least 7.1.0, current version is 7.0.0/
        );
      });

      it('with compatible environment', function () {
        const self = this;
        this.getVersionStub.withArgs().returns('3.0.0');
        this.getVersionStub.withArgs('inquirer').returns('7.1.0');
        return self.dummy.prompt([], self.dummy.config);
      });
    });
  });

  describe('mocked 2.8.1', () => {
    before(function () {
      this.timeout(100000);
      this.env = Environment.createEnv(
        [],
        {'skip-install': true},
        new TestAdapter()
      );
      this.getVersion = Environment.prototype.getVersion;
      delete Environment.prototype.getVersion;

      this.Dummy = class extends Base {};
      this.dummy = new this.Dummy(['bar', 'baz', 'bom'], {
        foo: false,
        something: 'else',
        namespace: 'dummy',
        env: this.env,
        skipCheckEnv: true,
        'skip-install': true
      });
    });

    after(function () {
      Environment.prototype.getVersion = this.getVersion;
    });

    describe('#checkEnvironmentVersion', () => {
      describe('without args', () => {
        it('throws exception', function () {
          assert.throws(
            () => this.dummy.checkEnvironmentVersion(),
            /requires yeoman-environment at least 2.9.0, current version is less than 2.9.0/
          );
        });
      });

      describe('with ignoreVersionCheck', () => {
        before(function () {
          this.dummy.options.ignoreVersionCheck = true;
        });

        after(function () {
          this.dummy.options.ignoreVersionCheck = false;
        });

        describe('without args', () => {
          it('returns false', function () {
            assert.equal(this.dummy.checkEnvironmentVersion(), false);
          });
        });

        describe('without less then 3.0.0', () => {
          it('returns undefined', function () {
            assert.equal(this.dummy.checkEnvironmentVersion('2.9.0'), false);
          });
        });
      });
    });
  });
});
