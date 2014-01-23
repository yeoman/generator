/*global describe, it, before, after, beforeEach, afterEach */
'use strict';
var sinon = require('sinon');
var generators = require('..');
var assert = generators.assert;
var helpers = generators.test;

var asyncStub = {
  on: function (key, cb) {
    if (key === 'exit') {
      cb();
    }
    return asyncStub;
  }
};

describe('Base Generator (actions/install mixin)', function () {
  beforeEach(function () {
    var env = this.env = generators();
    env.registerStub(helpers.createDummyGenerator(), 'dummy');
    this.dummy = env.create('dummy');

    // Keep track of all commands executed by spawnCommand.
    this.commandsRun = [];
    this.dummy.spawnCommand = function spawnCommand(cmd, args) {
      this.commandsRun.push([cmd, args]);
      return asyncStub;
    }.bind(this);
  });

  describe('#bowerInstall()', function () {
    it('spawn a bower process', function (done) {
      this.dummy.bowerInstall(null, done);
      assert(this.commandsRun.length, 1);
      assert.deepEqual(this.commandsRun[0], ['bower', ['install']]);
    });

    it('spawn a bower process with formatted options', function (done) {
      this.dummy.bowerInstall('jquery', { saveDev: true }, done);
      assert(this.commandsRun.length, 1);
      assert.deepEqual(this.commandsRun[0], ['bower', ['install', 'jquery', '--save-dev']]);
    });
  });

  describe('#npmInstall()', function () {
    it('run without callback', function () {
      this.dummy.npmInstall('yo', { save: true });
      assert.deepEqual(this.commandsRun.length, 1);
    });
  });

  describe('#installDependencies()', function () {
    it('spawn npm and bower', function (done) {
      this.dummy.installDependencies(function () {
        assert.deepEqual(this.commandsRun, [['bower', ['install']], ['npm', ['install']]]);
        done();
      }.bind(this));
    });

    it('doesn\'t spawn anything with skipInstall', function () {
      this.dummy.installDependencies({ skipInstall: true });
      assert.deepEqual(this.commandsRun.length, 0);
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
