/*global describe, before, beforeEach, it */
var fs = require('fs');
var path = require('path');
var util = require('util');
var events = require('events');
var assert = require('assert');
var sinon = require('sinon');
var proxyquire = require('proxyquire');
var generators = require('..');
var fetch = require('../lib/actions/fetch');

var noop = function () { return this; };


describe('generators.Base fetch utilities', function () {
  // increase timeout to 15s for this suite (slow connections like mine needs that)
  this.timeout(50000);

  before(generators.test.before(path.join(__dirname, 'temp')));

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

  describe('#bowerInstall', function () {
    it('fetch remote from Bower', function (done) {
      this.dummy.bowerInstall('backbone', function (err) {
        fs.stat('bower_components/backbone', done);
      });
    });
  });

  describe('#tarball', function () {
    beforeEach(function () {
      this.events = new events.EventEmitter();
      this.download = sinon.stub().returns(this.events);
      this.fetch = proxyquire('../lib/actions/fetch', { download: this.download });
      this.fetch.log = { write: noop, info: noop, ok: noop };
    });

    it('download and untar via the NPM download package', function (done) {
      var called = false;
      var from = 'https://github.com/yeoman/generator/archive/master.tar.gz';
      var dest = './yeoman-generator/';
      var cb = function () {
        called = true;
        done();
      };
      this.fetch.tarball(from, dest, cb);

      var downloadCall = this.download.args[0];
      assert.equal(downloadCall[0], from);
      assert.equal(downloadCall[1], dest);
      assert.ok(!called);
      this.events.emit('close');
    });

    it('aliases #extract', function () {
      assert.equal(fetch.tarball, fetch.extract);
    });
  });

  describe('#fetch', function () {
    it('should allow the fething of a single file', function (done) {
      this.dummy.fetch('https://raw.github.com/yeoman/generator/master/readme.md', './some/path/README.md', function (err) {
        if (err) {
          return done(err);
        }
        fs.stat('./some/path/README.md', done);
      });
    });
  });

  describe('#remote', function () {
    it('should remotely fetch a package on github', function (done) {
      this.dummy.remote('yeoman', 'generators', done);
    });

    it('should have the result cached internally into a `_cache` folder', function (done) {
      fs.stat(path.join(this.dummy.cacheRoot(), 'yeoman/generators/master'), done);
    });

    it('should invoke `cb` with a remote object to interract with the downloaded package', function (done) {
      this.dummy.remote('yeoman', 'generators', function (err, remote) {
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
