import assert from 'node:assert';
import os from 'node:os';
import path from 'node:path';
import {mkdirSync, rmSync} from 'node:fs';
import process from 'node:process';
import nock from 'nock';
import shell from 'shelljs';
import sinon from 'sinon';
import esmock from 'esmock';
import Base from '../src/generator.js';

/* eslint max-nested-callbacks: ["warn", 5] */

const tmpdir = path.join(os.tmpdir(), 'yeoman-user');

describe('Base#user', function () {
  this.timeout(10_000);

  beforeEach(function () {
    this.prevCwd = process.cwd();
    this.tmp = tmpdir;
    mkdirSync(path.join(tmpdir, 'subdir'), {recursive: true});
    process.chdir(tmpdir);
    shell.exec('git init --quiet');
    shell.exec('git config --local user.name Yeoman');
    shell.exec('git config --local user.email yo@yeoman.io');
  });

  afterEach(function () {
    process.chdir(this.prevCwd);
    rmSync(tmpdir, {force: true, recursive: true});
  });

  beforeEach(async function () {
    process.chdir(this.tmp);
    this.shell = shell;
    sinon.spy(this.shell, 'exec');

    this.user = await esmock('../src/actions/user', {
      shelljs: this.shell,
    });
  });

  afterEach(function () {
    this.shell.exec.restore();
  });

  it('is exposed on the Base generator', async () => {
    const userModule = await import('../src/actions/user.js');
    assert.equal(userModule.default, Base.prototype.user);
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
            items: [{login: 'mockname'}],
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
