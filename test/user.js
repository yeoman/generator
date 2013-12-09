/*global describe, before, it, after, before, beforeEach, afterEach */
var shell = require('shelljs');
var assert = require('assert');
var sinon = require('sinon');
var proxyquire = require('proxyquire');
var file = require('../lib/actions/file');
var async = require('async');

describe('Generator.user', function () {

  it('is exposed on the Base generator', function () {
    assert.equal(require('../lib/actions/user'), require('../lib/base').prototype.user);
  });

  describe('.git', function () {

    before(function (done) {
      this.cwd = process.cwd();
      this.tmp = shell.tempdir();
      shell.cd(this.tmp);
      file.mkdir('subdir');
      async.parallel([
        shell.exec.bind(shell, 'git init --quiet'),
        shell.exec.bind(shell, 'git config --local user.name Yeoman'),
        shell.exec.bind(shell, 'git config --local user.email yo@yeoman.io'),
      ], done);
    });

    after(function () {
      shell.cd(this.cwd);
    });

    beforeEach(function () {
      shell.cd(this.tmp);

      this.shell = shell;
      sinon.spy(this.shell, 'exec');

      this.user = proxyquire('../lib/actions/user', {
        'shelljs': this.shell
      });
    });

    afterEach(function () {
      this.shell.exec.restore();
    });

    describe('.username', function () {
      it('is the username used by git', function () {
        assert.equal(this.user.git.username, 'Yeoman');
      });

      it('is read-only', function () {
        this.user.git.username = 'bar';
        assert.notEqual(this.user.git.username, 'bar');
      });

      it('cache the value', function () {
        this.user.git.username;
        this.user.git.username;
        assert.equal(this.shell.exec.callCount, 1);
      });

      it('cache is linked to the CWD', function() {
        this.user.git.username;
        shell.cd('subdir');
        this.user.git.username;
        assert.equal(this.shell.exec.callCount, 2);
      });
    });

    describe('.email', function () {
      it('is the email used by git', function () {
        assert.equal(this.user.git.email, 'yo@yeoman.io');
      });

      it('is read-only', function () {
        this.user.git.email = 'bar';
        assert.notEqual(this.user.git.email, 'bar');
      });

      it('handle cache', function () {
        this.user.git.email;
        this.user.git.email;
        assert.equal(this.shell.exec.callCount, 1);
      });

      it('cache is linked to the CWD', function() {
        this.user.git.email;
        shell.cd('subdir');
        this.user.git.email;
        assert.equal(this.shell.exec.callCount, 2);
      });
    });

  });

});
