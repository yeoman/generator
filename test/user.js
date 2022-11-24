import assert from 'assert';
import os from 'os';
import path from 'path';
import makeDir from 'make-dir';
import nock from 'nock';
import rimraf from 'rimraf';
import shell from 'shelljs';
import sinon from 'sinon';
import {createRequire} from 'module';
import Base from '../lib/index.js';

const require = createRequire(import.meta.url);
const proxyquire = require('proxyquire');
/* eslint max-nested-callbacks: ["warn", 5] */

const tmpdir = path.join(os.tmpdir(), 'yeoman-user');

describe('Base#user', function () {
  this.timeout(10000);

  beforeEach(function () {
    this.prevCwd = process.cwd();
    this.tmp = tmpdir;
    makeDir.sync(path.join(tmpdir, 'subdir'));
    process.chdir(tmpdir);
    shell.exec('git init --quiet');
    shell.exec('git config --local user.name Yeoman');
    shell.exec('git config --local user.email yo@yeoman.io');
  });

  afterEach(function (done) {
    process.chdir(this.prevCwd);
    rimraf(tmpdir, done);
  });

  beforeEach(function () {
    process.chdir(this.tmp);
    this.shell = shell;
    sinon.spy(this.shell, 'exec');

    this.user = proxyquire('../lib/actions/user', {
      shelljs: this.shell
    });
  });

  afterEach(function () {
    this.shell.exec.restore();
  });

  it('is exposed on the Base generator', () => {
    assert.equal(require('../lib/actions/user'), Base.prototype.user);
  });

  describe('.git', () => {
    describe('.name()', () => {
      it('is the name used by git', function () {
        assert.equal(this.user.git.name(), 'Yeoman');
      });

      it('cache the value', function () {
        this.user.git.name();
        this.user.git.name();
        assert.equal(this.shell.exec.callCount, 1);
      });

      it('cache is linked to the CWD', function () {
        this.user.git.name();
        process.chdir('subdir');
        this.user.git.name();
        assert.equal(this.shell.exec.callCount, 2);
      });
    });

    describe('.email()', () => {
      it('is the email used by git', function () {
        assert.equal(this.user.git.email(), 'yo@yeoman.io');
      });

      it('handle cache', function () {
        this.user.git.email();
        this.user.git.email();
        assert.equal(this.shell.exec.callCount, 1);
      });

      it('cache is linked to the CWD', function () {
        this.user.git.email();
        process.chdir('subdir');
        this.user.git.email();
        assert.equal(this.shell.exec.callCount, 2);
      });
    });
  });

  describe('.github', () => {
    describe('.username()', () => {
      beforeEach(() => {
        nock('https://api.github.com')
          .filteringPath(/q=[^&]*/g, 'q=XXX')
          .get('/search/users?q=XXX')
          .times(1)
          .reply(200, {
            items: [{login: 'mockname'}]
          });
      });

      afterEach(() => {
        nock.restore();
      });

      it('is the username used by GitHub', function () {
        return this.user.github.username().then((resolved) => {
          assert.equal(resolved, 'mockname');
        });
      });
    });
  });
});
