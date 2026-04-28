import { beforeEach, describe, expect, it, vi } from 'vitest';
import { lte as semverLte } from 'semver';
import helpers from 'yeoman-test';
import type { BaseEnvironment } from '@yeoman/types';
import Generator from '../src/index.js';

describe('Base#package-json', () => {
  let generator: Generator;
  let env: BaseEnvironment;

  beforeEach(async () => {
    const context = helpers.create(Generator);
    await context.build();
    // eslint-disable-next-line prefer-destructuring
    generator = context.generator;
    // eslint-disable-next-line prefer-destructuring
    env = context.env;
    generator.exec = vi.fn();
  });

  describe('_resolvePackageJsonDependencies()', () => {
    it('should accept empty version and resolve', async ctx => {
      if (semverLte(env.getVersion(), '3.1.0')) {
        ctx.skip();
      }
      const dependencies = await generator._resolvePackageJsonDependencies('yeoman-generator');
      expect(dependencies['yeoman-generator']).toBeDefined();
    });

    it('should accept semver version', async () => {
      expect(await generator._resolvePackageJsonDependencies('yeoman-generator@^2')).toStrictEqual({
        'yeoman-generator': '^2',
      });
    });

    it('should accept object and return it', async () => {
      const a = { 'yeoman-generator': '^4' };
      expect(await generator._resolvePackageJsonDependencies(a)).toStrictEqual(a);
    });

    it('should resolve object with empty version and resolve', async ctx => {
      if (semverLte(env.getVersion(), '3.1.0')) {
        ctx.skip();
      }

      const a = { 'yeoman-generator': '' };
      const dependencies = await generator._resolvePackageJsonDependencies(a);
      expect(dependencies['yeoman-generator']);
    });

    it('should accept arrays', async () => {
      expect(
        await generator._resolvePackageJsonDependencies(['yeoman-generator@^2', 'yeoman-environment@^2']),
      ).toStrictEqual({
        'yeoman-generator': '^2',
        'yeoman-environment': '^2',
      });
    });
  });

  describe('addDependencies()', () => {
    it('should generate dependencies inside package.json', async () => {
      await generator.addDependencies('yeoman-generator@^2');
      expect(generator.packageJson.getAll()).toStrictEqual({
        dependencies: { 'yeoman-generator': '^2' },
      });
    });

    it('should accept object and merge inside package.json', async () => {
      await generator.addDependencies({ 'yeoman-generator': '^2' });
      expect(generator.packageJson.getAll()).toStrictEqual({
        dependencies: { 'yeoman-generator': '^2' },
      });
    });
  });

  describe('addDependencies()', () => {
    it('should generate dependencies inside package.json', async () => {
      await generator.addDevDependencies('yeoman-generator@^2');
      expect(generator.packageJson.getAll()).toStrictEqual({
        devDependencies: { 'yeoman-generator': '^2' },
      });
    });

    it('should accept object and merge devDependencies inside package.json', async () => {
      await generator.addDevDependencies({ 'yeoman-generator': '^2' });
      expect(generator.packageJson.getAll()).toStrictEqual({
        devDependencies: { 'yeoman-generator': '^2' },
      });
    });
  });
}, 10_000);
