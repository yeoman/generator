/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import { beforeEach, describe, expect, it } from 'vitest';
import { simpleGit } from 'simple-git';
import helpers from 'yeoman-test';
import Generator from '../src/index.js';

/* eslint max-nested-callbacks: ["warn", 5] */

describe('Base#user', () => {
  let user: Generator;

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
        expect(await user.git.name()).toBe('Yeoman');
      });
    });

    describe('.email()', () => {
      it('is the email used by git', async () => {
        expect(await user.git.email()).toBe('yo@yeoman.io');
      });
    });
  });

  describe.skip('.github', () => {
    describe('.username()', () => {
      /*
      Fetch mocking is not working as expected
      beforeEach(() => {
        nock('https://api.github.com')
          .filteringPath(/q=[^&]*\/g, 'q=XXX')
          .get('/search/users?q=XXX')
          .times(1)
          .reply(200, {
            items: [{ login: 'mockname' }],
          });
      });

      afterEach(() => {
        nock.restore();
      });
      */

      it('is the username used by GitHub', async () => {
        expect(await user.github.username()).toBe('mockname');
      });
    });
  });
}, 10_000);
