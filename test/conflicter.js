'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const sinon = require('sinon');
const TestAdapter = require('yeoman-test/lib/adapter').TestAdapter;
const Conflicter = require('../lib/util/conflicter');

describe('Conflicter', () => {
  beforeEach(function () {
    this.conflicter = new Conflicter(new TestAdapter());
  });

  it('#checkForCollision()', function () {
    const spy = sinon.spy();
    const contents = fs.readFileSync(__filename, 'utf8');
    this.conflicter.checkForCollision(__filename, contents, spy);
    const conflict = this.conflicter.conflicts.pop();

    assert.deepEqual(conflict.file.path, __filename);
    assert.deepEqual(conflict.file.contents, fs.readFileSync(__filename, 'utf8'));
    assert.deepEqual(conflict.callback, spy);
  });

  describe('#resolve()', () => {
    it('wihout conflict', function (done) {
      this.conflicter.resolve(done);
    });

    it('with a conflict', function (done) {
      const spy = sinon.spy();

      this.conflicter.force = true;
      this.conflicter.checkForCollision(__filename, fs.readFileSync(__filename), spy);
      this.conflicter.checkForCollision('foo.js', 'var foo = "foo";\n', spy);
      this.conflicter.resolve(() => {
        assert.equal(spy.callCount, 2);
        assert.equal(this.conflicter.conflicts.length, 0, 'Expected conflicter to be empty after running');
        done();
      });
    });
  });

  describe('#collision()', () => {
    beforeEach(function () {
      this.conflictingFile = {path: __filename, contents: ''};
    });

    it('identical status', function (done) {
      const me = fs.readFileSync(__filename, 'utf8');

      this.conflicter.collision({
        path: __filename,
        contents: me
      }, status => {
        assert.equal(status, 'identical');
        done();
      });
    });

    it('create status', function (done) {
      this.conflicter.collision({
        path: 'file-who-does-not-exist.js',
        contents: ''
      }, status => {
        assert.equal(status, 'create');
        done();
      });
    });

    it('user choose "yes"', function (done) {
      const conflicter = new Conflicter(new TestAdapter({action: 'write'}));

      conflicter.collision(this.conflictingFile, status => {
        assert.equal(status, 'force');
        done();
      });
    });

    it('user choose "skip"', function (done) {
      const conflicter = new Conflicter(new TestAdapter({action: 'skip'}));

      conflicter.collision(this.conflictingFile, status => {
        assert.equal(status, 'skip');
        done();
      });
    });

    it('user choose "force"', function (done) {
      const conflicter = new Conflicter(new TestAdapter({action: 'force'}));

      conflicter.collision(this.conflictingFile, status => {
        assert.equal(status, 'force');
        done();
      });
    });

    it('force conflict status', function (done) {
      this.conflicter.force = true;
      this.conflicter.collision(this.conflictingFile, status => {
        assert.equal(status, 'force');
        done();
      });
    });

    it('does not give a conflict on same binary files', function (done) {
      this.conflicter.collision({
        path: path.join(__dirname, 'fixtures/yeoman-logo.png'),
        contents: fs.readFileSync(path.join(__dirname, 'fixtures/yeoman-logo.png'))
      }, status => {
        assert.equal(status, 'identical');
        done();
      });
    });

    it('does not provide a diff option for directory', done => {
      const conflicter = new Conflicter(new TestAdapter({action: 'write'}));
      const spy = sinon.spy(conflicter.adapter, 'prompt');
      conflicter.collision({
        path: __dirname,
        contents: null
      }, () => {
        assert.equal(
          _.filter(spy.firstCall.args[0][0].choices, {value: 'diff'}).length,
          0
        );
        done();
      });
    });

    it('displays default diff for text files', done => {
      const testAdapter = new TestAdapter({action: 'diff'});
      const conflicter = new Conflicter(testAdapter);
      const _prompt = testAdapter.prompt.bind(testAdapter);
      const promptStub = sinon.stub(testAdapter, 'prompt', (prompts, resultHandler) => {
        if (promptStub.calledTwice) {
          const stubbedResultHandler = result => {
            result.action = 'write';
            return resultHandler(result);
          };

          return _prompt(prompts, stubbedResultHandler);
        }
        return _prompt(prompts, resultHandler);
      });

      conflicter.collision({
        path: path.join(__dirname, 'fixtures/foo.js'),
        contents: fs.readFileSync(path.join(__dirname, 'fixtures/foo-template.js'))
      }, () => {
        sinon.assert.neverCalledWithMatch(testAdapter.log.writeln, /Existing.*Replacement.*Diff/);
        sinon.assert.called(testAdapter.diff);
        done();
      });
    });

    it('displays custom diff for binary files', done => {
      const testAdapter = new TestAdapter({action: 'diff'});
      const conflicter = new Conflicter(testAdapter);
      const _prompt = testAdapter.prompt.bind(testAdapter);
      const promptStub = sinon.stub(testAdapter, 'prompt', (prompts, resultHandler) => {
        if (promptStub.calledTwice) {
          const stubbedResultHandler = result => {
            result.action = 'write';
            return resultHandler(result);
          };

          return _prompt(prompts, stubbedResultHandler);
        }
        return _prompt(prompts, resultHandler);
      });

      conflicter.collision({
        path: path.join(__dirname, 'fixtures/yeoman-logo.png'),
        contents: fs.readFileSync(path.join(__dirname, 'fixtures/testFile.tar.gz'))
      }, () => {
        sinon.assert.calledWithMatch(testAdapter.log.writeln, /Existing.*Replacement.*Diff/);
        sinon.assert.notCalled(testAdapter.diff);
        done();
      });
    });
  });
});
