import { TestAdapter } from '@yeoman/adapter/testing';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import Environment from 'yeoman-environment';
import helpers from 'yeoman-test';
import Base from './utils.js';

describe('Generator with environment version', () => {
  let env: Environment;
  let Dummy: typeof Base;
  let dummy: Base;
  let getVersionStub: ReturnType<typeof vi.spyOn>;

  beforeAll(async () => {
    await helpers.prepareTemporaryDir().run();
  });

  describe('mocked 3.0.0', () => {
    beforeAll(() => {
      env = new Environment({ skipInstall: true, adapter: new TestAdapter() });
      env.getVersion = env.getVersion || (() => {});
      getVersionStub = vi.spyOn(env, 'getVersion');

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
      getVersionStub.mockRestore();
    });

    describe('#checkEnvironmentVersion', () => {
      describe('without args', () => {
        it('returns true', () => {
          getVersionStub.mockReturnValue('3.0.0');
          // @ts-expect-error - check deprecated api
          expect(dummy.checkEnvironmentVersion()).toBe(true);
        });
      });

      describe('with required environment', () => {
        beforeAll(() => {
          getVersionStub.mockReturnValue('3.0.1');
        });

        it('returns true', () => {
          expect(dummy.checkEnvironmentVersion('3.0.1')).toBe(true);
        });

        describe('with ignoreVersionCheck', () => {
          beforeAll(() => {
            dummy.options.ignoreVersionCheck = true;
          });

          afterAll(() => {
            dummy.options.ignoreVersionCheck = false;
          });

          it('returns true', () => {
            getVersionStub.mockReturnValue('3.0.1');
            expect(dummy.checkEnvironmentVersion('3.0.1')).toBe(true);
          });
        });
      });

      describe('with greater than required environment', () => {
        it('returns true', () => {
          getVersionStub.mockReturnValue('3.0.2');
          expect(dummy.checkEnvironmentVersion('3.0.1')).toBe(true);
        });
      });

      describe('with less than required environment', () => {
        beforeAll(() => {
          getVersionStub.mockReturnValue('3.0.0');
        });

        it('should throw', () => {
          expect(() => dummy.checkEnvironmentVersion('3.0.1')).toThrow(
            /requires yeoman-environment at least 3.0.1, current version is 3.0.0/,
          );
        });

        describe('with warning', () => {
          it('should return false', () => {
            expect(dummy.checkEnvironmentVersion('3.0.1', true)).toBe(false);
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
            expect(dummy.checkEnvironmentVersion('3.0.1')).toBe(false);
          });
        });
      });

      describe('with required inquirer', () => {
        it('returns true', () => {
          getVersionStub.mockReturnValue('7.1.0');
          expect(dummy.checkEnvironmentVersion('inquirer', '7.1.0')).toBe(true);
        });
      });

      describe('with greater than required inquirer', () => {
        it('returns true', () => {
          getVersionStub.mockReturnValue('7.1.1');
          expect(dummy.checkEnvironmentVersion('inquirer', '7.1.0')).toBe(true);
        });
      });

      describe('with less than required inquirer', () => {
        beforeAll(() => {
          getVersionStub.mockReturnValue('7.1.0');
        });

        it('throws exception', () => {
          expect(() => dummy.checkEnvironmentVersion('inquirer', '7.1.1')).toThrow(
            /requires inquirer at least 7.1.1, current version is 7.1.0/,
          );
        });

        describe('with warning', () => {
          it('returns false', () => {
            expect(dummy.checkEnvironmentVersion('inquirer', '7.1.1', true)).toBe(false);
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
            expect(dummy.checkEnvironmentVersion('inquirer', '7.1.1')).toBe(false);
          });
        });
      });
    });

    describe('#prompt with storage', () => {
      it('with compatible environment', () => {
        getVersionStub.mockImplementation((arg?: string) => (arg === 'inquirer' ? '7.1.0' : '3.0.0'));
        return dummy.prompt([], dummy.config);
      });
    });
  });

  describe('mocked 2.8.1', () => {
    beforeAll(() => {
      env = new Environment({ skipInstall: true, adapter: new TestAdapter() });
      // @ts-expect-error - check outdated environment
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
          expect(
            // @ts-expect-error - check deprecated api
            () => dummy.checkEnvironmentVersion(),
          ).toThrow(/requires yeoman-environment at least 2.9.0, current version is less than 2.9.0/);
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
            // @ts-expect-error - check deprecated api
            expect(dummy.checkEnvironmentVersion()).toBe(false);
          });
        });

        describe('without less then 3.0.0', () => {
          it('returns undefined', () => {
            expect(dummy.checkEnvironmentVersion('2.9.0')).toBe(false);
          });
        });
      });
    });
  });
});
