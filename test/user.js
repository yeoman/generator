import assert from 'node:assert';
import os from 'node:os';
import path from 'node:path';
import { mkdirSync, rmSync } from 'node:fs';
import process from 'node:process';
import nock from 'nock';
import { simpleGit } from 'simple-git';
import userMixin from '../src/actions/user.js';

/* eslint max-nested-callbacks: ["warn", 5] */

const tmpdir = path.join(os.tmpdir(), 'yeoman-user');

describe('Base#user', function () {
  this.timeout(10_000);

  beforeEach(async function () {
    this.prevCwd = process.cwd();
    this.tmp = tmpdir;
    mkdirSync(path.join(tmpdir, 'subdir'), { recursive: true });
    process.chdir(tmpdir);
    const git = simpleGit();
    await git.init().addConfig('user.name', 'Yeoman').addConfig('user.email', 'yo@yeoman.io');
  });

  afterEach(function () {
    process.chdir(this.prevCwd);
    rmSync(tmpdir, { force: true, recursive: true });
  });

  beforeEach(async function () {
    process.chdir(this.tmp);
    this.user = new (userMixin(
      class Foo {
        destinationPath() {
          return tmpdir;
        }

        on() {}
      },
    ))();
  });

  describe('.git', () => {
    describe('.name()', () => {
      it('is the name used by git', async function () {
        assert.equal(await this.user.git.name(), 'Yeoman');
      });
    });

    describe('.email()', () => {
      it('is the email used by git', async function () {
        assert.equal(await this.user.git.email(), 'yo@yeoman.io');
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
            items: [{ login: 'mockname' }],
          });
      });

      afterEach(() => {
        nock.restore();
      });

      it('is the username used by GitHub', async function () {
        assert.equal(await this.user.github.username(), 'mockname');
      });
    });
  });
});
