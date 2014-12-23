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
    this[key] = cb;
    return asyncStub;
  },
  kill: function () {
    this.exit(130);
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
      var callbackSpy = sinon.spy();
      //args: installer, paths, options, cb
      this.dummy.runInstall('nestedScript', ['path1', 'path2'], spawnEnv, callbackSpy);
      this.dummy.run(function () {
        sinon.assert.calledWithExactly(
          this.spawnCommandStub,
          'nestedScript',
          ['install', 'path1', 'path2'],
          spawnEnv
        );
        sinon.assert.calledOnce(callbackSpy);
        done();
      }.bind(this));
    });
  });

  describe('#bowerInstall()', function () {
    it('spawn a bower process once per commands', function (done) {
      this.dummy.bowerInstall();
      this.dummy.bowerInstall();
      this.dummy.run(function () {
        sinon.assert.calledOnce(this.spawnCommandStub);
        sinon.assert.calledWithExactly(this.spawnCommandStub, 'bower', ['install'], {});
        done();
      }.bind(this));
    });

    it('spawn a bower process with formatted options', function (done) {
      this.dummy.bowerInstall('jquery', { saveDev: true }, function () {
        sinon.assert.calledOnce(this.spawnCommandStub);
        sinon.assert.calledWithExactly(
          this.spawnCommandStub,
          'bower',
          ['install', 'jquery', '--save-dev'],
          { saveDev: true }
        );
        done();
      }.bind(this));
      this.dummy.run();
    });
  });

  describe('#npmInstall()', function () {
    it('spawn an install process once per commands', function (done) {
      this.dummy.npmInstall();
      this.dummy.npmInstall();
      this.dummy.run(function () {
        sinon.assert.calledOnce(this.spawnCommandStub);
        sinon.assert.calledWithExactly(this.spawnCommandStub, 'npm', ['install'], {});
        done();
      }.bind(this));
    });

    it('run without callback', function (done) {
      this.dummy.npmInstall('yo', { save: true });
      this.dummy.run(function () {
        sinon.assert.calledOnce(this.spawnCommandStub);
        done();
      }.bind(this));
    });

    it('run with callback', function (done) {
      this.dummy.npmInstall('yo', { save: true }, function () {
        sinon.assert.calledOnce(this.spawnCommandStub);
        done();
      }.bind(this));
      this.dummy.run();
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
      this.dummy.run();
    });

    it('does not spawn anything with skipInstall', function (done) {
      this.dummy.installDependencies({ skipInstall: true });
      this.dummy.run(function () {
        sinon.assert.notCalled(this.spawnCommandStub);
        done();
      }.bind(this));
    });

    it('call callback if skipInstall', function (done) {
      this.dummy.installDependencies({ skipInstall: true, callback: done });
      this.dummy.run();
    });

    it('execute a callback after installs', function (done) {
      this.dummy.installDependencies({ callback: done });
      this.dummy.run();
    });

    it('accept and execute a function as its only argument', function (done) {
      this.dummy.installDependencies(done);
      this.dummy.run();
    });
  });

  describe('#terminateInstall()', function () {

    it('terminate at start', function (done) {
      var neverCalled = sinon.stub();
      this.dummy.on('install:terminated', done);
      this.dummy.on('bowerInstall:end', neverCalled);
      this.dummy.on('npmInstall:end', neverCalled);
      this.dummy.run(neverCalled);
      this.dummy.terminateInstall();
      this.dummy.installDependencies();
    });

    it('terminate after bower', function (done) {
      var neverCalled = sinon.stub();
      this.dummy.on('install:terminated', done);
      this.dummy.on('bowerInstall:end', this.dummy.terminateInstall);
      this.dummy.on('npmInstall:end', neverCalled);
      this.dummy.run(neverCalled);
      this.dummy.installDependencies();
    });

    it('execute run after terminate', function (done) {
      var installEnd = sinon.stub();
      this.dummy.on('bowerInstall:end', installEnd);
      this.dummy.on('npmInstall:end', installEnd);
      this.dummy.terminateInstall();
      this.dummy.installDependencies();
      this.dummy.run(function () {
        sinon.assert.calledTwice(installEnd);
        done();
      });
    });
  });
});
