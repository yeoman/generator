import assert from 'node:assert';
import os from 'node:os';
import path from 'node:path';
import { fn } from 'esmocha';
import semver from 'semver';
import helpers from 'yeoman-test';
import type Environment from '../src/environment.js';
import Generator from '../src/index.js';

const tmpdir = path.join(os.tmpdir(), 'yeoman-package-json');

describe('Base#package-json', function () {
  this.timeout(10_000);
  let generator: Generator;
  let env: Environment;

  beforeEach(async function () {
    const context = helpers.create(Generator);
    await context.build();
    generator = context.generator;
    env = context.env;
    generator.exec = fn();
  });

  describe('_resolvePackageJsonDependencies()', () => {
    beforeEach(() => {
      env.resolvePackage = fn<Environment['resolvePackage']>().mockImplementation((packageName, packageVersion) => [
        packageName.includes('@') ? packageName.split('@')[0] : packageName,

        packageName.includes('@') ? packageName.split('@')[1] : packageVersion || 'version',
      ]);
    });

    it('should accept empty version and resolve', async function () {
      if (semver.lte(env.getVersion(), '3.1.0')) {
        this.skip();
      }

      const dependencies = await generator._resolvePackageJsonDependencies('yeoman-generator');
      assert.strictEqual(dependencies['yeoman-generator'], 'version');
    });

    it('should accept semver version', async () => {
      assert.deepStrictEqual(await generator._resolvePackageJsonDependencies('yeoman-generator@^2'), {
        'yeoman-generator': '^2',
      });
    });

    it('should accept github repository version', async () => {
      env.resolvePackage = fn<Environment['resolvePackage']>().mockReturnValue([
        'yeoman-generator',
        'github:yeoman/generator#v4.13.0',
      ]);

      assert.deepStrictEqual(
        await generator._resolvePackageJsonDependencies('yeoman-generator@yeoman/generator#v4.13.0'),
        {
          'yeoman-generator': 'github:yeoman/generator#v4.13.0',
        },
      );
    });

    it('should accept object and return it', async () => {
      const a = { 'yeoman-generator': '^4' };
      assert.deepStrictEqual(await generator._resolvePackageJsonDependencies(a), a);
    });

    it('should resolve object with empty version and resolve', async function () {
      if (semver.lte(env.getVersion(), '3.1.0')) {
        this.skip();
      }

      const a = { 'yeoman-generator': '' };
      const dependencies = await generator._resolvePackageJsonDependencies(a);
      assert.equal(dependencies['yeoman-generator'], 'version');
    });

    it('should accept arrays', async () => {
      assert.deepStrictEqual(
        await generator._resolvePackageJsonDependencies(['yeoman-generator@^2', 'yeoman-environment@^2']),
        {
          'yeoman-generator': '^2',
          'yeoman-environment': '^2',
        },
      );
    });
  });

  describe('addDependencies()', () => {
    beforeEach(() => {
      env.resolvePackage = fn<Environment['resolvePackage']>().mockImplementation((packageName, packageVersion) => [
        packageName.includes('@') ? packageName.split('@')[0] : packageName,
        packageName.includes('@') ? packageName.split('@')[1] : packageVersion,
      ]);
    });
    it('should generate dependencies inside package.json', async () => {
      await generator.addDependencies('yeoman-generator@^2');
      assert.deepStrictEqual(generator.packageJson.getAll(), {
        dependencies: { 'yeoman-generator': '^2' },
      });
    });

    it('should accept object and merge inside package.json', async () => {
      await generator.addDependencies({ 'yeoman-generator': '^2' });
      assert.deepStrictEqual(generator.packageJson.getAll(), {
        dependencies: { 'yeoman-generator': '^2' },
      });
    });
  });

  describe('addDependencies()', () => {
    beforeEach(() => {
      env.resolvePackage = fn<Environment['resolvePackage']>().mockImplementation((packageName, packageVersion) => [
        packageName.includes('@') ? packageName.split('@')[0] : packageName,
        packageName.includes('@') ? packageName.split('@')[1] : packageVersion,
      ]);
    });
    it('should generate dependencies inside package.json', async () => {
      await generator.addDevDependencies('yeoman-generator@^2');
      assert.deepStrictEqual(generator.packageJson.getAll(), {
        devDependencies: { 'yeoman-generator': '^2' },
      });
    });

    it('should accept object and merge devDependencies inside package.json', async () => {
      await generator.addDevDependencies({ 'yeoman-generator': '^2' });
      assert.deepStrictEqual(generator.packageJson.getAll(), {
        devDependencies: { 'yeoman-generator': '^2' },
      });
    });
  });
});
