/*global describe, it, before, after, beforeEach, afterEach */
'use strict';
var yeoman = require('yeoman-environment');
var generators = require('..');
var helpers = generators.test;
var TestAdapter = require('../lib/test/adapter').TestAdapter;
var sinon = require('sinon');

var asyncStub = {
  on: function (key, cb) {
    if (key === 'exit') {
      cb();
    }
    return asyncStub;
  }
};

describe('generators.Base (actions/install mixin)', function () {
  beforeEach(function () {
    this.env = yeoman.createEnv([], {}, new TestAdapter());
    this.env.registerStub(helpers.createDummyGenerator(), 'dummy');
    this.dummy = this.env.create('dummy');

    // Keep track of all commands executed by spawnCommand.
    this.spawnCommandStub = sinon.stub(this.dummy, 'spawnCommand');
    this.spawnCommandStub.returns(asyncStub);
  });

  describe('#runInstall()', function () {
    it('takes a config object and passes it to the spawned process', function (done) {
      var spawnEnv = {
        env: {
          PATH: '/path/to/bin'
        }
      };
      //args: installer, paths, options, cb
      this.dummy.runInstall('nestedScript', ['path1', 'path2'], spawnEnv, done);
      sinon.assert.calledWithExactly(this.spawnCommandStub, 'nestedScript', ['install', 'path1', 'path2'], spawnEnv);
    });
  });

  describe('#bowerInstall()', function () {
    it('spawn a bower process', function (done) {
      this.dummy.bowerInstall(null, done);
      sinon.assert.calledOnce(this.spawnCommandStub);
      sinon.assert.calledWithExactly(this.spawnCommandStub, 'bower', ['install'], {});
    });

    it('spawn a bower process with formatted options', function (done) {
      this.dummy.bowerInstall('jquery', { saveDev: true }, done);
      sinon.assert.calledOnce(this.spawnCommandStub);
      sinon.assert.calledWithExactly(this.spawnCommandStub, 'bower', ['install', 'jquery', '--save-dev'], { saveDev: true });
    });
  });

  describe('#npmInstall()', function () {
    it('run without callback', function () {
      this.dummy.npmInstall('yo', { save: true });
      sinon.assert.calledOnce(this.spawnCommandStub);
    });
  });

  describe('#installDependencies()', function () {
    it('spawn npm and bower', function (done) {
      this.dummy.installDependencies(function () {
        sinon.assert.calledTwice(this.spawnCommandStub);
        sinon.assert.calledWithExactly(this.spawnCommandStub, 'bower', ['install'], {});
        sinon.assert.calledWithExactly(this.spawnCommandStub, 'npm', ['install'], {});
        done();
      }.bind(this));
    });

    it('doesn\'t spawn anything with skipInstall', function () {
      this.dummy.installDependencies({ skipInstall: true });
      sinon.assert.notCalled(this.spawnCommandStub);
    });

    it('call callback if skipInstall', function (done) {
      this.dummy.installDependencies({ skipInstall: true, callback: done });
    });

    it('execute a callback after installs', function (done) {
      this.dummy.installDependencies({ callback: done });
    });

    it('accept and execute a function as its only argument', function (done) {
      this.dummy.installDependencies(done);
    });
  });
});
