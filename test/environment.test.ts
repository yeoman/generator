import assert from 'node:assert';
import { TestAdapter } from '@yeoman/adapter/testing';
import { afterAll, beforeAll, describe, it } from 'vitest';
import type { SinonStub } from 'sinon';
import { stub as sinonStub } from 'sinon';
import Environment from 'yeoman-environment';
import helpers from 'yeoman-test';
import Base from './utils.js';

describe('Generator with environment version', () => {
  let env: Environment;
  let Dummy: typeof Base;
  let dummy: Base;
  let getVersionStub: SinonStub;

  beforeAll(async () => {
    await helpers.prepareTemporaryDir().run();
  });

  describe('mocked 3.0.0', () => {
    beforeAll(() => {
      env = new Environment({ skipInstall: true, adapter: new TestAdapter() });
      env.getVersion = env.getVersion || (() => {});
      getVersionStub = sinonStub(env, 'getVersion');

      Dummy = class extends Base {};
      dummy = new Dummy(['bar', 'baz', 'bom'], {
        foo: false,
        something: 'else',
        namespace: 'dummy',
        env: env,
        'skip-install': true,
        skipCheckEnv: true,
      });
    }, 100_000);

    afterAll(() => {
      getVersionStub.restore();
    });

    describe('#checkEnvironmentVersion', () => {
      describe('without args', () => {
        it('returns true', () => {
          getVersionStub.returns('3.0.0');
          assert.equal(dummy.checkEnvironmentVersion(), true);
        });
      });

      describe('with required environment', () => {
        beforeAll(() => {
          getVersionStub.returns('3.0.1');
        });

        it('returns true', () => {
          assert.equal(dummy.checkEnvironmentVersion('3.0.1'), true);
        });

        describe('with ignoreVersionCheck', () => {
          beforeAll(() => {
            dummy.options.ignoreVersionCheck = true;
          });

          afterAll(() => {
            dummy.options.ignoreVersionCheck = false;
          });

          it('returns true', () => {
            getVersionStub.returns('3.0.1');
            assert.equal(dummy.checkEnvironmentVersion('3.0.1'), true);
          });
        });
      });

      describe('with greater than required environment', () => {
        it('returns true', () => {
          getVersionStub.returns('3.0.2');
          assert.equal(dummy.checkEnvironmentVersion('3.0.1'), true);
        });
      });

      describe('with less than required environment', () => {
        beforeAll(() => {
          getVersionStub.returns('3.0.0');
        });

        it('should throw', () => {
          assert.throws(
            () => dummy.checkEnvironmentVersion('3.0.1'),
            /requires yeoman-environment at least 3.0.1, current version is 3.0.0/,
          );
        });

        describe('with warning', () => {
          it('should return false', () => {
            assert.equal(dummy.checkEnvironmentVersion('3.0.1', true), false);
          });
        });

        describe('with ignoreVersionCheck', () => {
          beforeAll(() => {
            dummy.options.ignoreVersionCheck = true;
          });

          afterAll(() => {
            dummy.options.ignoreVersionCheck = false;
          });

          it('returns false', () => {
            assert.equal(dummy.checkEnvironmentVersion('3.0.1'), false);
          });
        });
      });

      describe('with required inquirer', () => {
        it('returns true', () => {
          getVersionStub.withArgs('inquirer').returns('7.1.0');
          assert.equal(dummy.checkEnvironmentVersion('inquirer', '7.1.0'), true);
        });
      });

      describe('with greater than required inquirer', () => {
        it('returns true', () => {
          getVersionStub.withArgs('inquirer').returns('7.1.1');
          assert.equal(dummy.checkEnvironmentVersion('inquirer', '7.1.0'), true);
        });
      });

      describe('with less than required inquirer', () => {
        beforeAll(() => {
          getVersionStub.withArgs('inquirer').returns('7.1.0');
        });

        it('throws exception', () => {
          assert.throws(
            () => dummy.checkEnvironmentVersion('inquirer', '7.1.1'),
            /requires inquirer at least 7.1.1, current version is 7.1.0/,
          );
        });

        describe('with warning', () => {
          it('returns false', () => {
            assert.equal(dummy.checkEnvironmentVersion('inquirer', '7.1.1', true), false);
          });
        });

        describe('with ignoreVersionCheck', () => {
          beforeAll(() => {
            dummy.options.ignoreVersionCheck = true;
          });

          afterAll(() => {
            dummy.options.ignoreVersionCheck = false;
          });

          it('returns false', () => {
            assert.equal(dummy.checkEnvironmentVersion('inquirer', '7.1.1'), false);
          });
        });
      });
    });

    describe('#prompt with storage', () => {
      it('with compatible environment', () => {
        getVersionStub.withArgs().returns('3.0.0');
        getVersionStub.withArgs('inquirer').returns('7.1.0');
        return dummy.prompt([], dummy.config);
      });
    });
  });

  describe('mocked 2.8.1', () => {
    beforeAll(() => {
      env = new Environment({ skipInstall: true, adapter: new TestAdapter() });
      env.getVersion = undefined;

      Dummy = class extends Base {};
      dummy = new Dummy(['bar', 'baz', 'bom'], {
        foo: false,
        something: 'else',
        namespace: 'dummy',
        env: env,
        skipCheckEnv: true,
        'skip-install': true,
      });
    }, 100_000);

    describe('#checkEnvironmentVersion', () => {
      describe('without args', () => {
        it('throws exception', () => {
          assert.throws(
            () => dummy.checkEnvironmentVersion(),
            /requires yeoman-environment at least 2.9.0, current version is less than 2.9.0/,
          );
        });
      });

      describe('with ignoreVersionCheck', () => {
        beforeAll(() => {
          dummy.options.ignoreVersionCheck = true;
        });

        afterAll(() => {
          dummy.options.ignoreVersionCheck = false;
        });

        describe('without args', () => {
          it('returns false', () => {
            assert.equal(dummy.checkEnvironmentVersion(), false);
          });
        });

        describe('without less then 3.0.0', () => {
          it('returns undefined', () => {
            assert.equal(dummy.checkEnvironmentVersion('2.9.0'), false);
          });
        });
      });
    });
  });
});
