import assert from 'node:assert';
import nock from 'nock';
import { simpleGit } from 'simple-git';
import helpers from 'yeoman-test';
import Generator from '../src/index.js';

/* eslint max-nested-callbacks: ["warn", 5] */

describe('Base#user', function () {
  this.timeout(10_000);

  beforeEach(async function () {
    const context = helpers.create(Generator);
    await context.build();
    this.user = context.generator;
    const git = simpleGit();
    await git.init().addConfig('user.name', 'Yeoman').addConfig('user.email', 'yo@yeoman.io');
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
