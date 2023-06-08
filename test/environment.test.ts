import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert';
// eslint-disable-next-line n/file-extension-in-import
import { TestAdapter } from '@yeoman/adapter/testing';
import { stub as sinonStub } from 'sinon';
import Environment from 'yeoman-environment';
import helpers from 'yeoman-test';
import Base from './utils.js';

const tmpdir = path.join(os.tmpdir(), 'yeoman-generator-environment');

describe('Generator with environment version', () => {
  before(helpers.setUpTestDirectory(tmpdir));
  describe('mocked 3.0.0', () => {
    before(function () {
      this.timeout(100_000);
      this.env = new Environment({ skipInstall: true, adapter: new TestAdapter() });
      this.env.getVersion = this.env.getVersion || (() => {});
      this.getVersionStub = sinonStub(this.env, 'getVersion');

      this.Dummy = class extends Base {};
      this.dummy = new this.Dummy(['bar', 'baz', 'bom'], {
        foo: false,
        something: 'else',
        namespace: 'dummy',
        env: this.env,
        'skip-install': true,
        skipCheckEnv: true,
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
            /requires yeoman-environment at least 3.0.1, current version is 3.0.0/,
          );
        });

        describe('with warning', () => {
          it('should return false', function () {
            assert.equal(this.dummy.checkEnvironmentVersion('3.0.1', true), false);
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
          assert.equal(this.dummy.checkEnvironmentVersion('inquirer', '7.1.0'), true);
        });
      });

      describe('with greater than required inquirer', () => {
        it('returns true', function () {
          this.getVersionStub.withArgs('inquirer').returns('7.1.1');
          assert.equal(this.dummy.checkEnvironmentVersion('inquirer', '7.1.0'), true);
        });
      });

      describe('with less than required inquirer', () => {
        before(function () {
          this.getVersionStub.withArgs('inquirer').returns('7.1.0');
        });

        it('throws exception', function () {
          assert.throws(
            () => this.dummy.checkEnvironmentVersion('inquirer', '7.1.1'),
            /requires inquirer at least 7.1.1, current version is 7.1.0/,
          );
        });

        describe('with warning', () => {
          it('returns false', function () {
            assert.equal(this.dummy.checkEnvironmentVersion('inquirer', '7.1.1', true), false);
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
            assert.equal(this.dummy.checkEnvironmentVersion('inquirer', '7.1.1'), false);
          });
        });
      });
    });

    describe('#prompt with storage', () => {
      it('with compatible environment', function () {
        this.getVersionStub.withArgs().returns('3.0.0');
        this.getVersionStub.withArgs('inquirer').returns('7.1.0');
        return this.dummy.prompt([], this.dummy.config);
      });
    });
  });

  describe('mocked 2.8.1', () => {
    before(function () {
      this.timeout(100_000);
      this.env = new Environment({ skipInstall: true, adapter: new TestAdapter() });
      this.env.getVersion = undefined;

      this.Dummy = class extends Base {};
      this.dummy = new this.Dummy(['bar', 'baz', 'bom'], {
        foo: false,
        something: 'else',
        namespace: 'dummy',
        env: this.env,
        skipCheckEnv: true,
        'skip-install': true,
      });
    });

    describe('#checkEnvironmentVersion', () => {
      describe('without args', () => {
        it('throws exception', function () {
          assert.throws(
            () => this.dummy.checkEnvironmentVersion(),
            /requires yeoman-environment at least 2.9.0, current version is less than 2.9.0/,
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
