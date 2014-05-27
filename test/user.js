/*global describe, before, it, after, before, beforeEach, afterEach */
/*jshint expr: true */
'use strict';
var shell = require('shelljs');
var assert = require('assert');
var sinon = require('sinon');
var proxyquire = require('proxyquire');
var file = require('../lib/actions/file');

describe('Generator#user', function () {

  it('is exposed on the Base generator', function () {
    assert.equal(require('../lib/actions/user'), require('../lib/base').prototype.user);
  });

  describe('.git', function () {

    before(function () {
      this.cwd = process.cwd();
      this.tmp = shell.tempdir();
      shell.cd(this.tmp);
      file.mkdir('subdir');
      shell.exec('git init --quiet');
      shell.exec('git config --local user.name Yeoman');
      shell.exec('git config --local user.email yo@yeoman.io');
    });

    after(function () {
      shell.cd(this.cwd);
    });

    beforeEach(function () {
      shell.cd(this.tmp);

      this.shell = shell;
      sinon.spy(this.shell, 'exec');

      this.user = proxyquire('../lib/actions/user', {
        shelljs: this.shell
      });
    });

    afterEach(function () {
      this.shell.exec.restore();
    });

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
        shell.cd('subdir');
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
        shell.cd('subdir');
        this.user.git.email();
        assert.equal(this.shell.exec.callCount, 2);
      });
    });

  });

  describe('.github', function () {

    before(function () {
      this.cwd = process.cwd();
      this.tmp = shell.tempdir();
      shell.cd(this.tmp);
      file.mkdir('subdir');
      shell.exec('git init --quiet');
      shell.exec('git config --local user.name Zeno');
      shell.exec('git config --local user.email hi@zenorocha.com');
    });

    after(function () {
      shell.cd(this.cwd);
    });

    beforeEach(function () {
      shell.cd(this.tmp);

      this.shell = shell;
      sinon.spy(this.shell, 'exec');

      this.user = proxyquire('../lib/actions/user', {
        shelljs: this.shell
      });
    });

    afterEach(function () {
      this.shell.exec.restore();
    });

    describe('.username()', function () {
      it('is the username used by GitHub', function (done) {
        this.user.github.username(function (err, res) {
          assert.equal(res, 'zenorocha');
          done();
        });
      });
    });

  });

});
