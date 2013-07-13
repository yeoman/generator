/*global describe, before, it, after, before */
var userUtils = require('../lib/actions/user');
var shell = require('shelljs');
var assert = require('assert');

describe('user utility method', function () {


  before(function () {
    this.cwd = process.cwd();
    this.tmp = shell.tempdir();
    shell.cd(this.tmp);
    shell.exec('git init --quiet');
    shell.exec('git config --local user.name Yeoman');
    shell.exec('git config --local user.email yo@yeoman.io');
  });

  after(function () {
    shell.cd(this.cwd);
  });

  it('git.getUsername should return the username used by git', function () {
    var username = userUtils.git.getUsername();
    assert.equal(username, 'Yeoman');
  });

  it('git.getEmail should return the email used by git', function () {
    var email = userUtils.git.getEmail();
    assert.equal(email, 'yo@yeoman.io');
  });

});
