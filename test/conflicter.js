/*global describe, before, after, it, beforeEach, afterEach */
'use strict';
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var Conflicter = require('../lib/util/conflicter');
var TestAdapter = require('../lib/test/adapter').TestAdapter;
var sinon = require('sinon');

var fileFoo = {
  file: 'foo.js',
  content: 'var foo = "foo";\n'
};
var fileBar = {
  file: 'boo.js',
  content: 'var boo = "boo";\n'
};

describe('Conflicter', function () {
  beforeEach(function () {
    this.conflicter = new Conflicter(new TestAdapter());
  });

  it('#add()', function () {
    this.conflicter.add({
      file: __filename,
      content: fs.readFileSync(__filename, 'utf8')
    });
    var conflict = this.conflicter.pop();
    assert.deepEqual(conflict.file, __filename);
    assert.deepEqual(conflict.content, fs.readFileSync(__filename, 'utf8'));
  });

  it('#pop()', function () {
    this.conflicter.add(fileFoo);
    this.conflicter.add(fileBar);
    var conflict = this.conflicter.pop();
    assert.deepEqual(conflict.file, 'boo.js');
    assert.deepEqual(conflict.content, 'var boo = "boo";\n');
  });

  it('#shift()', function () {
    this.conflicter.add(fileFoo);
    this.conflicter.add(fileBar);
    var conflict = this.conflicter.shift();
    assert.deepEqual(conflict.file, 'foo.js');
    assert.deepEqual(conflict.content, 'var foo = "foo";\n');
  });

  describe('#resolve()', function () {
    it('wihout conflict', function (done) {
      this.conflicter.resolve(done);
    });

    it('with a conflict', function (done) {
      var spy = sinon.spy();
      this.conflicter.force = true;

      this.conflicter.add({
        file: __filename,
        content: fs.readFileSync(__filename),
        callback: spy
      });
      this.conflicter.add({
        file: 'foo.js',
        content: 'var foo = "foo";\n',
        callback: spy
      });

      this.conflicter.resolve(function () {
        assert.equal(spy.callCount, 2);
        assert.equal(this.conflicter.conflicts.length, 0, 'Expected conflicter to be empty after running');
        done();
      }.bind(this));
    });
  });

  describe('#collision()', function () {
    it('identical status', function (done) {
      var me = fs.readFileSync(__filename, 'utf8');
      this.conflicter.collision(__filename, me, function (status) {
        assert.equal(status, 'identical');
        done();
      });
    });

    it('create status', function (done) {
      this.conflicter.collision('file-who-does-not-exist.js', '', function (status) {
        assert.equal(status, 'create');
        done();
      });
    });

    it('user choose "yes"', function (done) {
      var conflicter = new Conflicter(new TestAdapter({ action: 'write' }));
      conflicter.collision(__filename, '', function (status) {
        assert.equal(status, 'force');
        done();
      });
    });

    it('user choose "skip"', function (done) {
      var conflicter = new Conflicter(new TestAdapter({ action: 'skip' }));
      conflicter.collision(__filename, '', function (status) {
        assert.equal(status, 'skip');
        done();
      });
    });

    it('user choose "force"', function (done) {
      var conflicter = new Conflicter(new TestAdapter({ action: 'force' }));
      conflicter.collision(__filename, '', function (status) {
        assert.equal(status, 'force');
        done();
      });
    });

    it('force conflict status', function (done) {
      this.conflicter.force = true;
      this.conflicter.collision(__filename, '', function (status) {
        assert.equal(status, 'force');
        done();
      });
    });

    it('does not give a conflict on same binary files', function (done) {
      this.conflicter.force = true;
      this.conflicter.collision(
        path.join(__dirname, 'fixtures/yeoman-logo.png'),
        fs.readFileSync(path.join(__dirname, 'fixtures/yeoman-logo.png')),
        function (status) {
          assert.equal(status, 'identical');
          done();
        }.bind(this)
      );
    });
  });
});
