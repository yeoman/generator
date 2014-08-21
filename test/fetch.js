/*global describe, before, beforeEach, it */
'use strict';
var fs = require('fs');
var path = require('path');
var util = require('util');
var events = require('events');
var tmpdir = require('os').tmpdir();
var assert = require('assert');
var nock = require('nock');
var generators = require('..');
var fetch = require('../lib/actions/fetch');

var noop = function () { return this; };

describe('generators.Base fetch utilities', function () {
  // increase timeout to 15s for this suite (slow connections like mine needs that)
  this.timeout(50000);

  before(generators.test.setUpTestDirectory(path.join(__dirname, 'temp')));

  beforeEach(function () {
    function Dummy() {
      generators.Base.apply(this, arguments);
    }
    util.inherits(Dummy, generators.Base);

    Dummy.prototype.test = function () {
      this.shouldRun = true;
    };

    this.env = generators();
    this.dummy = new Dummy({
      env: this.env,
      resolved: 'test:fetch'
    });
    this.Dummy = Dummy;
  });

  describe('#bowerInstall()', function () {
    it('fetch remote from Bower', function (done) {
      this.dummy.bowerInstall('backbone', function () {
        fs.stat('bower_components/backbone', done);
      });
    });
  });

  describe('#tarball()', function () {
    it('download and untar via the NPM download package', function (done) {
      var tmp = path.join(tmpdir, 'yeoman-test');
      var scope = nock('http://example.com')
        .get('/f.tar.gz')
        .replyWithFile(200, path.join(__dirname, 'fixtures/testFile.tar.gz'));

      this.dummy.tarball('http://example.com/f.tar.gz', tmp, function (err) {
        if (err) {
          return done(err);
        }
        assert(scope.isDone());
        done();
      });
    });

    it('aliases #extract()', function () {
      assert.equal(fetch.tarball, fetch.extract);
    });
  });

  describe('#fetch()', function () {
    it('allow the fetching of a single file', function (done) {
      var tmp = path.join(tmpdir, 'yeoman-test');
      var scope = nock('http://example.com')
        .get('/f.txt')
        .replyWithFile(200, path.join(__dirname, 'fixtures/help.txt'));

      this.dummy.fetch('http://example.com/f.txt', tmp, function (err) {
        if (err) {
          return done(err);
        }
        assert(scope.isDone());
        fs.stat(path.join(tmp, 'f.txt'), done);
      });
    });
  });

  describe('#remote()', function () {
    it('remotely fetch a package on github', function (done) {
      this.dummy.remote('yeoman', 'generator', done);
    });

    it('cache the result internally into a `_cache` folder', function (done) {
      fs.stat(path.join(this.dummy.cacheRoot(), 'yeoman/generator/master'), done);
    });

    it('invoke `cb` with a remote object to interract with the downloaded package', function (done) {
      this.dummy.remote('yeoman', 'generator', function (err, remote) {
        if (err) {
          return done(err);
        }

        ['copy', 'template', 'directory'].forEach(function (method) {
          assert.equal(typeof remote[method], 'function');
        });

        done();
      });
    });
  });

});
