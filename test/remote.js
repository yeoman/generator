/*global describe, it, before */
'use strict';
var generators = require('..');
var path = require('path');
var fs = require('fs');
var assert = require('assert');

describe('yeoman.base#remote', function () {
  before(generators.test.setUpTestDirectory(path.join(__dirname, 'temp')));

  before(function () {
    var env = this.env = generators();
    env.registerStub(generators.test.createDummyGenerator(), 'dummy');
    this.dummy = env.create('dummy');
  });

  describe('callback argument remote#copy', function () {

    before(function (done) {
      this.dummy.remote('yeoman', 'generator', 'master', function (err, remote) {
        this.dummy.foo = 'foo';
        remote.copy('test/fixtures/template.jst', 'remote/template.js');
        this.dummy.conflicter.resolve(done);
      }.bind(this), true);
    });

    it('copy a file from a remote resource', function (done) {
      fs.readFile('remote/template.js', function (err, data) {
        assert.equal(data.toString(), 'var foo = \'foo\';\n');
        done();
      });
    });
  });

  describe('callback argument remote#bulkCopy', function () {

    before(function (done) {
      this.dummy.remote('yeoman', 'generator', 'master', function (err, remote) {
        remote.bulkCopy('test/fixtures/foo-template.js', 'remote/foo-template.js');
        this.dummy.conflicter.resolve(done);
      }.bind(this), true);
    });

    it('copy a file from a remote resource', function (done) {
      fs.stat('remote/foo-template.js', done);
    });

    it('doesn\'t process templates on bulkCopy', function (done) {
      fs.readFile('remote/foo-template.js', function (err, data) {
        assert.equal(data.toString(), 'var <%= foo %> = \'<%= foo %>\';\n');
        done();
      });
    });
  });

  describe('callback argument remote#directory', function () {

    before(function (done) {
      this.dummy.remote('yeoman', 'generator', 'master', function (err, remote) {
        remote.directory('test/generators', 'remote/generators');
        this.dummy.conflicter.resolve(done);
      }.bind(this), true);
    });

    it('copy a directory from a remote resource', function (done) {
      fs.stat('remote/generators/test-angular.js', done);
    });

  });

  describe('callback argument remote#bulkDirectory', function () {

    before(function (done) {
      this.dummy.remote('yeoman', 'generator', 'master', function (err, remote) {
        remote.bulkDirectory('test/fixtures', 'remote/fixtures');
        this.dummy.conflicter.resolve(done);
      }.bind(this), true);
    });

    it('copy a directory from a remote resource', function (done) {
      fs.stat('remote/fixtures/foo.js', done);
    });

    it('doesn\'t process templates on bulkDirectory', function (done) {
      fs.readFile('remote/fixtures/foo-template.js', function (err, data) {
        assert.equal(data.toString(), 'var <%= foo %> = \'<%= foo %>\';\n');
        done();
      });
    });

  });

  describe('callback argument remote fileUtils Environment instances', function () {
    before(function (done) {
      this.cachePath = path.join(this.dummy.cacheRoot(), 'yeoman/generator/master');
      this.dummy.remote('yeoman', 'generator', 'master', function (err, remote) {
        this.remoteArg = remote;
        done();
      }.bind(this));
    });

    it('.src is scoped to cachePath', function () {
      assert.equal(this.remoteArg.src.fromBase('.'), this.cachePath);
      assert.equal(this.remoteArg.src.fromDestBase('.'), this.dummy.destinationRoot());
    });

    it('.dest is scoped to destinationRoot', function () {
      assert.equal(this.remoteArg.dest.fromBase('.'), this.dummy.destinationRoot());
      assert.equal(this.remoteArg.dest.fromDestBase('.'), this.cachePath);
    });
  });

});
