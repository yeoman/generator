'use strict';
const assert = require('assert');
const os = require('os');
const path = require('path');
const mkdirp = require('mkdirp');
const nock = require('nock');
const proxyquire = require('proxyquire');
const rimraf = require('rimraf');
const shell = require('shelljs');
const sinon = require('sinon');
const Base = require('..');

const tmpdir = path.join(os.tmpdir(), 'yeoman-user');

describe('Base#user', () => {
  before(function () {
    this.prevCwd = process.cwd();
    this.tmp = tmpdir;
    mkdirp.sync(path.join(tmpdir, 'subdir'));
    process.chdir(tmpdir);
    shell.exec('git init --quiet');
    shell.exec('git config --local user.name Yeoman');
    shell.exec('git config --local user.email yo@yeoman.io');
  });

  after(function (done) {
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
            items: [
              {login: 'mockname'}
            ]
          });
      });

      afterEach(() => {
        nock.restore();
      });

      it('is the username used by GitHub', function () {
        return this.user.github.username().then(res => {
          assert.equal(res, 'mockname');
        });
      });
    });
  });
});
