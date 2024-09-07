import assert from 'node:assert';
import { afterEach, beforeEach, describe, it } from 'vitest';
import nock from 'nock';
import { simpleGit } from 'simple-git';
import helpers from 'yeoman-test';
import Generator from '../src/index.js';

/* eslint max-nested-callbacks: ["warn", 5] */

describe('Base#user', () => {
  let user;

  beforeEach(async () => {
    const context = helpers.create(Generator);
    await context.build();
    user = context.generator;
    const git = simpleGit();
    await git.init().addConfig('user.name', 'Yeoman').addConfig('user.email', 'yo@yeoman.io');
  });

  describe('.git', () => {
    describe('.name()', () => {
      it('is the name used by git', async () => {
        assert.equal(await user.git.name(), 'Yeoman');
      });
    });

    describe('.email()', () => {
      it('is the email used by git', async () => {
        assert.equal(await user.git.email(), 'yo@yeoman.io');
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

      it('is the username used by GitHub', async () => {
        assert.equal(await user.github.username(), 'mockname');
      });
    });
  });
}, 10_000);
