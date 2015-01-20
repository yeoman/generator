/*global describe, before, it, after, before, beforeEach, afterEach */
'use strict';
var assert = require('assert');
var os = require('os');
var path = require('path');
var mkdirp = require('mkdirp');
var nock = require('nock');
var proxyquire = require('proxyquire');
var rimraf = require('rimraf');
var shell = require('shelljs');
var sinon = require('sinon');
var generators = require('../');
var tmpdir = path.join(os.tmpdir(), 'yeoman-user');

describe('generators.Base#user', function () {
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

  it('is exposed on the Base generator', function () {
    assert.equal(require('../lib/actions/user'), generators.Base.prototype.user);
  });

  describe('.git', function () {
    describe('.name()', function () {
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

    describe('.email()', function () {
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

  describe('.github', function () {
    describe('.username()', function () {
      beforeEach(function () {
        nock('https://api.github.com')
          .filteringPath(/q=[^&]*/g, 'q=XXX')
          .get('/search/users?q=XXX')
          .times(1)
          .reply(200, {
            items: [
              { login: 'mockname' }
            ]
          });
      });

      afterEach(function () {
        nock.restore();
      });

      it('is the username used by GitHub', function (done) {
        this.user.github.username(function (err, res) {
          assert.equal(res, 'mockname');
          done();
        });
      });
    });
  });
});
