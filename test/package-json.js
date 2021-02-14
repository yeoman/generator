'use strict';
const assert = require('assert');
const os = require('os');
const path = require('path');
const makeDir = require('make-dir');
const rimraf = require('rimraf');
const Environment = require('yeoman-environment');

const Base = require('..');

const tmpdir = path.join(os.tmpdir(), 'yeoman-package-json');

describe('Base#package-json', function () {
  this.timeout(10000);
  let generator;
  let env;

  beforeEach(function () {
    this.prevCwd = process.cwd();
    this.tmp = tmpdir;
    makeDir.sync(path.join(tmpdir, 'subdir'));
    process.chdir(tmpdir);

    env = Environment.createEnv();
    const Generator = class extends Base {};
    Generator.prototype.exec = function () {};
    generator = new Generator({
      env
    });
  });

  afterEach(function (done) {
    process.chdir(this.prevCwd);
    rimraf(tmpdir, done);
  });

  describe('_resolvePackageJsonDependencies()', () => {
    it('should accept semver version', async () => {
      assert.deepStrictEqual(
        await generator._resolvePackageJsonDependencies('yeoman-generator@^2'),
        {'yeoman-generator': '^2'}
      );
    });

    it('should accept github repository', async () => {
      assert.deepStrictEqual(
        await generator._resolvePackageJsonDependencies(
          'yeoman/generator#v4.13.0'
        ),
        {'yeoman-generator': 'github:yeoman/generator#v4.13.0'}
      );
    });

    it('should accept github repository version', async () => {
      assert.deepStrictEqual(
        await generator._resolvePackageJsonDependencies(
          'yeoman-generator@yeoman/generator#v4.13.0'
        ),
        {'yeoman-generator': 'github:yeoman/generator#v4.13.0'}
      );
    });

    it('should accept object and return it', async () => {
      const a = {};
      assert.strictEqual(await generator._resolvePackageJsonDependencies(a), a);
    });

    it('should accept arrays', async () => {
      assert.deepStrictEqual(
        await generator._resolvePackageJsonDependencies([
          'yeoman-generator@^2',
          'yeoman-environment@^2'
        ]),
        {'yeoman-generator': '^2', 'yeoman-environment': '^2'}
      );
    });
  });

  describe('addDependencies()', () => {
    it('should generate dependencies inside package.json', async () => {
      await generator.addDependencies('yeoman-generator@^2');
      assert.deepStrictEqual(generator.packageJson.getAll(), {
        dependencies: {'yeoman-generator': '^2'}
      });
    });

    it('should accept object and merge inside package.json', async () => {
      await generator.addDependencies({'yeoman-generator': '^2'});
      assert.deepStrictEqual(generator.packageJson.getAll(), {
        dependencies: {'yeoman-generator': '^2'}
      });
    });
  });

  describe('addDependencies()', () => {
    it('should generate dependencies inside package.json', async () => {
      await generator.addDevDependencies('yeoman-generator@^2');
      assert.deepStrictEqual(generator.packageJson.getAll(), {
        devDependencies: {'yeoman-generator': '^2'}
      });
    });

    it('should accept object and merge devDependencies inside package.json', async () => {
      await generator.addDevDependencies({'yeoman-generator': '^2'});
      assert.deepStrictEqual(generator.packageJson.getAll(), {
        devDependencies: {'yeoman-generator': '^2'}
      });
    });
  });
});
