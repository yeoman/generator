/*global describe it */
var generators = require('..');
var path = require('path');
var fs = require('fs');
var assert = require('assert');
var sinon = require('sinon');

describe('yeoman.remote', function () {
  before(generators.test.before(path.join(__dirname, 'temp')));

  before(function () {
    var env = this.env = generators();
    env.registerStub(generators.test.createDummyGenerator(), 'dummy');
    this.dummy = env.create('dummy');
  });

  describe('remote.copy(source, destination)', function () {

    before(function (done) {
      this.dummy.remote('yeoman', 'generator', 'master', function (err, remote) {
        this.dummy.foo = 'foo';
        remote.copy('test/fixtures/template.jst', 'remote/template.js');
        this.dummy.conflicter.resolve(done);
      }.bind(this), true);
    });

    it('should copy a file from a remote resource', function (done) {
      fs.readFile('remote/template.js', function (err, data) {
        if (err) throw err;
        assert.equal(data+'', 'var foo = \'foo\';\n');
        done();
      });
    });
  });

  describe('remote.bulkCopy(source, destination)', function () {

    before(function (done) {
      this.dummy.remote('yeoman', 'generator', 'master', function (err, remote) {
        remote.bulkCopy('test/fixtures/foo-template.js', 'remote/foo-template.js');
        this.dummy.conflicter.resolve(done);
      }.bind(this), true);
    });

    it('should copy a file from a remote resource', function (done) {
      fs.stat('remote/foo-template.js', done);
    });

    it('should not process templates on bulkCopy', function (done) {
      fs.readFile('remote/foo-template.js', function (err, data) {
        if (err) throw err;
        assert.equal(data+'', 'var <%= foo %> = \'<%= foo %>\';\n');
        done();
      });
    });
  });

  describe('remote.directory(source, destination)', function () {

    before(function (done) {
      this.dummy.remote('yeoman', 'generator', 'master', function (err, remote) {
        remote.directory('test/generators', 'remote/generators');
        this.dummy.conflicter.resolve(done);
      }.bind(this), true);
    });

    it('should copy a directory from a remote resource', function (done) {
      fs.stat('remote/generators/test-angular.js', done);
    });

  });

  describe('remote.bulkDirectory(source, destination)', function () {

    before(function (done) {
      this.dummy.remote('yeoman', 'generator', 'master', function (err, remote) {
        remote.bulkDirectory('test/fixtures', 'remote/fixtures');
        this.dummy.conflicter.resolve(done);
      }.bind(this), true);
    });

    it('should copy a directory from a remote resource', function (done) {
      fs.stat('remote/fixtures/foo.js', done);
    });

    it('should not process templates on bulkDirectory', function (done) {
      fs.readFile('remote/fixtures/foo-template.js', function (err, data) {
        if (err) throw err;
        assert.equal(data+'', 'var <%= foo %> = \'<%= foo %>\';\n');
        done();
      });
    });

  });

  describe('remote.src', function () {
    it('should expose a src environment', function (done) {
      this.dummy.remote('yeoman', 'generator', 'master', function (err, remote) {
        if (err) done(err);

        var result = remote.src.read('package.json');
        assert.ok(result.indexOf('yeoman-generator') > -1,
                  'should contain the string package.json');
        done();
      });
    });
  });

  describe('remote.dest', function () {
    it('should expose a dest environment', function (done) {
      var spy = sinon.stub(this.dummy, 'getCollisionFilter').returns(
        function fakeValidator() { return true }
      );
      this.dummy.remote('yeoman', 'generator', 'master', function (err, remote) {
        if (err) done(err);

        remote.dest.write('dest.tmp', 'UNICORNS AHEAD');
        assert.ok(fs.readFileSync(path.join(__dirname, 'temp', 'dest.tmp'), 'utf-8'),
                  'UNICORNS AHEAD');
        done();
      });
    });
  });

  describe.skip('remote package', function () {
    this.timeout(0);

    it('env.remote(name)', function (done) {
      var env = generators();
      env.remote('mklabs/generators#generator-backbone', done);
    });

    it('init from remote', function (done) {
      generators(['mklabs/generators#generator-angular', 'mklabs/generators#generator-chromeapp'])
        .run(done);
    });
  });

});
