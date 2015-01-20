/*global describe, before, beforeEach, it */
'use strict';
var fs = require('fs');
var path = require('path');
var tmpdir = require('os').tmpdir();
var nock = require('nock');
var yeoman = require('yeoman-environment');
var fetch = require('../lib/actions/fetch');
var TestAdapter = require('../lib/test/adapter').TestAdapter;
var generators = require('../');
var assert = generators.assert;

var tmp = path.join(tmpdir, 'yeoman-fetch');

describe('generators.Base (actions/fetch)', function () {
  beforeEach(function () {
    this.dummy = new generators.Base({
      env: yeoman.createEnv([], {}, new TestAdapter()),
      resolved: 'test:fetch'
    });
  });

  describe('#tarball()', function () {
    it('download and untar via the NPM download package', function (done) {
      var scope = nock('http://example.com')
        .get('/f.tar.gz')
        .replyWithFile(200, path.join(__dirname, 'fixtures/testFile.tar.gz'));

      this.dummy.tarball('http://example.com/f.tar.gz', tmp, function (err) {
        if (err) return done(err);
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
      var scope = nock('http://example.com')
        .get('/f.txt')
        .replyWithFile(200, path.join(__dirname, 'fixtures/help.txt'));

      this.dummy.fetch('http://example.com/f.txt', tmp, function (err) {
        if (err) return done(err);
        assert(scope.isDone());
        fs.stat(path.join(tmp, 'f.txt'), done);
      });
    });
  });
});
