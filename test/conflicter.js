/*global describe, before, after, it, beforeEach, afterEach */
'use strict';
var assert = require('assert');
var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var sinon = require('sinon');
var Conflicter = require('../lib/util/conflicter');
var TestAdapter = require('yeoman-test/lib/adapter').TestAdapter;

describe('Conflicter', function () {
  beforeEach(function () {
    this.conflicter = new Conflicter(new TestAdapter());
  });

  it('#checkForCollision()', function () {
    var spy = sinon.spy();
    var contents = fs.readFileSync(__filename, 'utf8');
    this.conflicter.checkForCollision(__filename, contents, spy);
    var conflict = this.conflicter.conflicts.pop();

    assert.deepEqual(conflict.file.path, __filename);
    assert.deepEqual(conflict.file.contents, fs.readFileSync(__filename, 'utf8'));
    assert.deepEqual(conflict.callback, spy);
  });

  describe('#resolve()', function () {
    it('wihout conflict', function (done) {
      this.conflicter.resolve(done);
    });

    it('with a conflict', function (done) {
      var spy = sinon.spy();

      this.conflicter.force = true;
      this.conflicter.checkForCollision(__filename, fs.readFileSync(__filename), spy);
      this.conflicter.checkForCollision('foo.js', 'var foo = "foo";\n', spy);
      this.conflicter.resolve(function () {
        assert.equal(spy.callCount, 2);
        assert.equal(this.conflicter.conflicts.length, 0, 'Expected conflicter to be empty after running');
        done();
      }.bind(this));
    });
  });

  describe('#collision()', function () {
    beforeEach(function () {
      this.conflictingFile = { path: __filename, contents: '' };
    });

    it('identical status', function (done) {
      var me = fs.readFileSync(__filename, 'utf8');

      this.conflicter.collision({
        path: __filename,
        contents: me
      }, function (status) {
        assert.equal(status, 'identical');
        done();
      });
    });

    it('create status', function (done) {
      this.conflicter.collision({
        path: 'file-who-does-not-exist.js',
        contents: ''
      }, function (status) {
        assert.equal(status, 'create');
        done();
      });
    });

    it('user choose "yes"', function (done) {
      var conflicter = new Conflicter(new TestAdapter({ action: 'write' }));

      conflicter.collision(this.conflictingFile, function (status) {
        assert.equal(status, 'force');
        done();
      });
    });

    it('user choose "skip"', function (done) {
      var conflicter = new Conflicter(new TestAdapter({ action: 'skip' }));

      conflicter.collision(this.conflictingFile, function (status) {
        assert.equal(status, 'skip');
        done();
      });
    });

    it('user choose "force"', function (done) {
      var conflicter = new Conflicter(new TestAdapter({ action: 'force' }));

      conflicter.collision(this.conflictingFile, function (status) {
        assert.equal(status, 'force');
        done();
      });
    });

    it('force conflict status', function (done) {
      this.conflicter.force = true;
      this.conflicter.collision(this.conflictingFile, function (status) {
        assert.equal(status, 'force');
        done();
      });
    });

    it('does not give a conflict on same binary files', function (done) {
      this.conflicter.collision({
        path: path.join(__dirname, 'fixtures/yeoman-logo.png'),
        contents: fs.readFileSync(path.join(__dirname, 'fixtures/yeoman-logo.png'))
      }, function (status) {
        assert.equal(status, 'identical');
        done();
      });
    });

    it('does not provide a diff option for directory', function (done) {
      var conflicter = new Conflicter(new TestAdapter({ action: 'write' }));
      var spy = sinon.spy(conflicter.adapter, 'prompt');
      conflicter.collision({
        path: __dirname,
        contents: null
      }, function () {
        assert.equal(
          _.filter(spy.firstCall.args[0][0].choices, { value: 'diff' }).length,
          0
        );
        done();
      });
    });

    it('displays default diff for text files', function (done) {
      var testAdapter = new TestAdapter({ action: 'diff' });
      var conflicter = new Conflicter(testAdapter);
      var _prompt = testAdapter.prompt.bind(testAdapter);
      var promptStub = sinon.stub(testAdapter, 'prompt', function (prompts, resultHandler) {
        if (promptStub.calledTwice) {
          var stubbedResultHandler = function (result) {
            result.action = 'write';
            return resultHandler(result);
          };

          return _prompt(prompts, stubbedResultHandler);
        } else {
          return _prompt(prompts, resultHandler);
        }
      });

      conflicter.collision({
        path: path.join(__dirname, 'fixtures/foo.js'),
        contents: fs.readFileSync(path.join(__dirname, 'fixtures/foo-template.js'))
      }, function () {
        sinon.assert.neverCalledWithMatch(testAdapter.log.writeln, /Existing.*Replacement.*Diff/);
        sinon.assert.called(testAdapter.diff);
        done();
      });
    });

    it('displays custom diff for binary files', function (done) {
      var testAdapter = new TestAdapter({ action: 'diff' });
      var conflicter = new Conflicter(testAdapter);
      var _prompt = testAdapter.prompt.bind(testAdapter);
      var promptStub = sinon.stub(testAdapter, 'prompt', function (prompts, resultHandler) {
        if (promptStub.calledTwice) {
          var stubbedResultHandler = function (result) {
            result.action = 'write';
            return resultHandler(result);
          };

          return _prompt(prompts, stubbedResultHandler);
        } else {
          return _prompt(prompts, resultHandler);
        }
      });

      conflicter.collision({
        path: path.join(__dirname, 'fixtures/yeoman-logo.png'),
        contents: fs.readFileSync(path.join(__dirname, 'fixtures/testFile.tar.gz'))
      }, function () {
        sinon.assert.calledWithMatch(testAdapter.log.writeln, /Existing.*Replacement.*Diff/);
        sinon.assert.notCalled(testAdapter.diff);
        done();
      });
    });
  });
});
