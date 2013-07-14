/*global describe, before, it, after, before, beforeEach, afterEach */
var shell = require('shelljs');
var assert = require('assert');
var sinon = require('sinon');
var proxyquire = require('proxyquire');
var file = require('../lib/actions/file');

describe('user utility', function () {

  it('should be exposed on the Base generator', function () {
    assert.equal(require('../lib/actions/user'), require('../lib/base').prototype.user);
  });

  describe('git methods', function () {

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
      this.shell = shell;
      sinon.spy(this.shell, 'exec');

      this.user = proxyquire('../lib/actions/user', {
        'shelljs': this.shell
      });
    });

    afterEach(function () {
      this.shell.exec.restore();
      shell.cd(this.tmp);
    });

    describe('`username`', function () {

      it('should be the username used by git', function () {
        assert.equal(this.user.git.username, 'Yeoman');
      });

      it('should be read-only', function () {
        this.user.git.username = 'bar';
        assert.notEqual(this.user.git.username, 'bar');
      });

      it('should handle cache', function () {
        // Should use cache when used multiple time
        this.user.git.username;
        this.user.git.username;
        assert.equal(this.shell.exec.callCount, 1);

        // Cache should be link the CWD, so changing dir rerun the check
        shell.cd('subdir');
        this.user.git.username;
        assert.equal(this.shell.exec.callCount, 2);
      });

    });

    describe('`email`', function () {

      it('should be the email used by git', function () {
        assert.equal(this.user.git.email, 'yo@yeoman.io');
      });

      it('should be read-only', function () {
        this.user.git.email = 'bar';
        assert.notEqual(this.user.git.email, 'bar');
      });

      it('should handle cache', function () {
        // Should use cache when used multiple time
        this.user.git.email;
        this.user.git.email;
        assert.equal(this.shell.exec.callCount, 1);

        // Cache should be link the CWD, so changing dir rerun the check
        shell.cd('subdir');
        this.user.git.email;
        assert.equal(this.shell.exec.callCount, 2);
      });

    });

  });

});
