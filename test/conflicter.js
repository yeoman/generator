'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const _ = require('lodash');
const sinon = require('sinon');
const { TestAdapter } = require('yeoman-test/lib/adapter');
const Conflicter = require('../lib/util/conflicter');

const createActions = actions => {
  return {
    _action: actions,
    get action() {
      return this._action.shift();
    }
  };
};

describe('Conflicter', () => {
  beforeEach(function() {
    this.conflicter = new Conflicter(new TestAdapter());
  });

  describe('#checkForCollision()', () => {
    it('correctly pushes to conflicts', function() {
      const spy = sinon.spy();
      const contents = fs.readFileSync(__filename, 'utf8');
      this.conflicter.checkForCollision(__filename, contents, spy);
      const conflict = this.conflicter.conflicts.pop();

      assert.deepEqual(conflict.file.path, __filename);
      assert.deepEqual(conflict.file.contents, fs.readFileSync(__filename, 'utf8'));
      assert.deepEqual(conflict.callback, spy);
    });

    it('handles predefined status', function() {
      const spy = sinon.spy();
      const contents = fs.readFileSync(__filename, 'utf8');
      this.conflicter.checkForCollision(
        { path: __filename, contents, conflicter: 'someStatus' },
        spy
      );
      spy.calledWith(null, 'someStatus');
    });
  });

  describe('#resolve()', () => {
    it('without conflict', function(done) {
      this.conflicter.resolve(done);
    });

    it('with a conflict', function(done) {
      const spy = sinon.spy();

      this.conflicter.force = true;
      this.conflicter.checkForCollision(__filename, fs.readFileSync(__filename), spy);
      this.conflicter.checkForCollision('foo.js', 'var foo = "foo";\n', spy);
      this.conflicter.resolve(() => {
        assert.equal(spy.callCount, 2);
        assert.equal(
          this.conflicter.conflicts.length,
          0,
          'Expected conflicter to be empty after running'
        );
        done();
      });
    });
  });

  describe('#collision()', () => {
    beforeEach(function() {
      this.conflictingFile = { path: __filename, contents: '' };
    });

    it('identical status', function(done) {
      const me = fs.readFileSync(__filename, 'utf8');

      this.conflicter.collision(
        {
          path: __filename,
          contents: me
        },
        status => {
          assert.equal(status, 'identical');
          done();
        }
      );
    });

    it('create status', function(done) {
      this.conflicter.collision(
        {
          path: 'file-who-does-not-exist.js',
          contents: ''
        },
        status => {
          assert.equal(status, 'create');
          done();
        }
      );
    });

    it('user choose "yes"', function(done) {
      const conflicter = new Conflicter(new TestAdapter({ action: 'write' }));

      conflicter.collision(this.conflictingFile, status => {
        assert.equal(status, 'force');
        done();
      });
    });

    it('user choose "skip"', function(done) {
      const conflicter = new Conflicter(new TestAdapter({ action: 'skip' }));

      conflicter.collision(this.conflictingFile, status => {
        assert.equal(status, 'skip');
        done();
      });
    });

    it('user choose "force"', function(done) {
      const conflicter = new Conflicter(new TestAdapter({ action: 'force' }));

      conflicter.collision(this.conflictingFile, status => {
        assert.equal(status, 'force');
        done();
      });
    });

    it('force conflict status', function(done) {
      this.conflicter.force = true;
      this.conflicter.collision(this.conflictingFile, status => {
        assert.equal(status, 'force');
        done();
      });
    });

    it('abort on first conflict', function(done) {
      this.timeout(4000);
      const conflicter = new Conflicter(new TestAdapter(), false, true);
      assert.throws(
        conflicter.collision.bind(conflicter, this.conflictingFile),
        /^ConflicterConflictError: Process aborted by conflict$/
      );
      done();
    });

    it('abort on first conflict with whitespace changes', function(done) {
      const conflicter = new Conflicter(new TestAdapter(), false, {
        bail: true
      });
      conflicter.collision(
        {
          path: path.join(__dirname, 'fixtures/file-conflict.txt'),
          contents: `initial
                 content
      `
        },
        status => {
          assert.equal(status, 'skip');
          done();
        }
      );
    });

    it('abort on create new file', function(done) {
      const conflicter = new Conflicter(new TestAdapter(), false, {
        bail: true
      });
      assert.throws(
        conflicter.collision.bind(conflicter, {
          path: 'file-who-does-not-exist2.js',
          contents: ''
        }),
        /^ConflicterConflictError: Process aborted by conflict$/
      );
      done();
    });

    it('skip file changes with dryRun', function(done) {
      const conflicter = new Conflicter(new TestAdapter(), false, {
        dryRun: true
      });
      conflicter.collision(
        {
          path: path.join(__dirname, 'fixtures/file-conflict.txt'),
          contents: `initial
                 content
      `
        },
        status => {
          assert.equal(status, 'skip');
          done();
        }
      );
    });

    it('skip new file with dryRun', function(done) {
      const conflicter = new Conflicter(new TestAdapter(), false, {
        dryRun: true
      });
      conflicter.collision(
        {
          path: 'file-who-does-not-exist2.js',
          contents: ''
        },
        status => {
          assert.equal(status, 'skip');
          done();
        }
      );
    });

    it('skip deleted file with dryRun', function(done) {
      const conflicter = new Conflicter(new TestAdapter(), false, {
        dryRun: true
      });
      conflicter.collision(
        {
          path: path.join(__dirname, 'fixtures/foo.js'),
          contents: null
        },
        status => {
          assert.equal(status, 'skip');
          done();
        }
      );
    });

    it('skip whitespace changes with dryRun', function(done) {
      const conflicter = new Conflicter(new TestAdapter(), false, {
        dryRun: true,
        ignoreWhitespace: true
      });
      conflicter.collision(
        {
          path: path.join(__dirname, 'fixtures/file-conflict.txt'),
          contents: `initial
                 content
      `
        },
        status => {
          assert.equal(status, 'skip');
          done();
        }
      );
    });

    it('does not give a conflict with ignoreWhitespace', function(done) {
      const conflicter = new Conflicter(new TestAdapter(), false, {
        ignoreWhitespace: true
      });

      conflicter.collision(
        {
          path: path.join(__dirname, 'fixtures/file-conflict.txt'),
          contents: `initial
           content
`
        },
        status => {
          assert.equal(status, 'identical');
          done();
        }
      );
    });

    it('skip rewrite with ignoreWhitespace and skipRegenerate', function(done) {
      const conflicter = new Conflicter(new TestAdapter(), false, {
        ignoreWhitespace: true,
        skipRegenerate: true
      });

      conflicter.collision(
        {
          path: path.join(__dirname, 'fixtures/file-conflict.txt'),
          contents: `initial
           content
`
        },
        status => {
          assert.equal(status, 'skip');
          done();
        }
      );
    });

    it('does give a conflict without ignoreWhitespace', function(done) {
      const conflicter = new Conflicter(new TestAdapter({ action: 'skip' }));

      conflicter.collision(
        {
          path: path.join(__dirname, 'fixtures/file-conflict.txt'),
          contents: `initial
           content
`
        },
        status => {
          assert.equal(status, 'skip');
          done();
        }
      );
    });

    it('does not give a conflict on same binary files', function(done) {
      this.conflicter.collision(
        {
          path: path.join(__dirname, 'fixtures/yeoman-logo.png'),
          contents: fs.readFileSync(path.join(__dirname, 'fixtures/yeoman-logo.png'))
        },
        status => {
          assert.equal(status, 'identical');
          done();
        }
      );
    });

    it('does not provide a diff option for directory', done => {
      const conflicter = new Conflicter(new TestAdapter({ action: 'write' }));
      const spy = sinon.spy(conflicter.adapter, 'prompt');
      conflicter.collision(
        {
          path: __dirname,
          contents: null
        },
        () => {
          assert.equal(
            _.filter(spy.firstCall.args[0][0].choices, { value: 'diff' }).length,
            0
          );
          done();
        }
      );
    });

    it('displays default diff for text files', done => {
      const testAdapter = new TestAdapter(createActions(['diff', 'write']));
      const conflicter = new Conflicter(testAdapter);

      conflicter.collision(
        {
          path: path.join(__dirname, 'fixtures/foo.js'),
          contents: fs.readFileSync(path.join(__dirname, 'fixtures/foo-template.js'))
        },
        () => {
          sinon.assert.neverCalledWithMatch(
            testAdapter.log.writeln,
            /Existing.*Replacement.*Diff/
          );
          sinon.assert.called(testAdapter.diff);
          done();
        }
      );
    });

    it('shows old content for deleted text files', done => {
      const testAdapter = new TestAdapter(createActions(['diff', 'write']));
      const conflicter = new Conflicter(testAdapter);

      conflicter.collision(
        {
          path: path.join(__dirname, 'fixtures/foo.js'),
          contents: null
        },
        () => {
          sinon.assert.neverCalledWithMatch(
            testAdapter.log.writeln,
            /Existing.*Replacement.*Diff/
          );
          sinon.assert.called(testAdapter.diff);
          done();
        }
      );
    });

    it('displays custom diff for binary files', done => {
      const testAdapter = new TestAdapter(createActions(['diff', 'write']));
      const conflicter = new Conflicter(testAdapter);

      conflicter.collision(
        {
          path: path.join(__dirname, 'fixtures/yeoman-logo.png'),
          contents: fs.readFileSync(path.join(__dirname, 'fixtures/testFile.tar.gz'))
        },
        () => {
          sinon.assert.calledWithMatch(
            testAdapter.log.writeln,
            /Existing.*Replacement.*Diff/
          );
          sinon.assert.notCalled(testAdapter.diff);
          done();
        }
      );
    });

    it('displays custom diff for deleted binary files', done => {
      const testAdapter = new TestAdapter(createActions(['diff', 'write']));
      const conflicter = new Conflicter(testAdapter);

      conflicter.collision(
        {
          path: path.join(__dirname, 'fixtures/yeoman-logo.png'),
          contents: null
        },
        () => {
          sinon.assert.calledWithMatch(
            testAdapter.log.writeln,
            /Existing.*Replacement.*Diff/
          );
          sinon.assert.notCalled(testAdapter.diff);
          done();
        }
      );
    });
  });
});
