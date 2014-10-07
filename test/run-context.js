/*global it, describe, before, beforeEach, afterEach */
'use strict';
var path = require('path');
var assert = require('assert');
var sinon = require('sinon');
var yo = require('..');
var helpers = yo.test;

var RunContext = require('../lib/test/run-context');

describe('RunContext', function () {
  beforeEach(function () {
    var Dummy = this.Dummy = helpers.createDummyGenerator();
    this.execSpy = sinon.spy();
    Dummy.prototype.exec = this.execSpy;
    this.ctx = new RunContext(Dummy);
  });

  describe('constructor', function () {
    it('accept path parameter', function (done) {
      var ctx = new RunContext(path.join(__dirname, './fixtures/custom-generator-simple'));
      ctx.on('ready', function () {
        assert(ctx.env.get('simple:app'));
        done();
      });
    });

    it('accept flgRun false parameter and create an instance of the generator without running it', function (done) {
      this.runSpy = sinon.spy(RunContext.prototype._run);
      this.createSpy = sinon.spy(RunContext.prototype._create);
      RunContext.prototype._run = this.runSpy;
      RunContext.prototype._create = this.createSpy;
      var ctx = new RunContext(path.join(__dirname, './fixtures/custom-generator-simple'), false);

      ctx.on('ready', function () {
        assert(this.runSpy.notCalled);
        sinon.assert.calledOnce(this.createSpy);
        done();
      }.bind(this));

    });

    it('accept flgRun true parameter and run the generator', function (done) {
      this.runSpy = sinon.spy(RunContext.prototype._run);
      this.createSpy = sinon.spy(RunContext.prototype._create);
      RunContext.prototype._run = this.runSpy;
      RunContext.prototype._create = this.createSpy;
      var ctx = new RunContext(path.join(__dirname, './fixtures/custom-generator-simple'), true);
      ctx.on('end', function () {
        assert(this.createSpy.notCalled);
        sinon.assert.calledOnce(this.runSpy);
        done();
      }.bind(this));

    });

    it('accept generator constructor parameter (and assign gen:test as namespace)', function (done) {
      this.ctx.on('ready', function () {
        assert(this.ctx.env.get('gen:test'));
        done();
      }.bind(this));
    });

    it('run the generator asynchronously', function (done) {
      assert(this.execSpy.notCalled);
      this.ctx.on('end', function () {
        sinon.assert.calledOnce(this.execSpy);
        done();
      }.bind(this));
    });

    it('only run a generator once', function (done) {
      this.ctx.on('end', function () {
        sinon.assert.calledOnce(this.execSpy);
        done();
      }.bind(this));
      this.ctx._run();
      this.ctx._run();
    });
  });

  describe('#inDir()', function () {
    beforeEach(function () {
      process.chdir(__dirname);
      this.tmp = path.join(__dirname, './temp.dev');
    });

    it('call helpers.testDirectory()', function () {
      sinon.spy(helpers, 'testDirectory');
      this.ctx.inDir(this.tmp);
      assert(helpers.testDirectory.withArgs(this.tmp).calledOnce);
      helpers.testDirectory.restore();
    });

    it('is chainable', function () {
      assert.equal(this.ctx.inDir(this.tmp), this.ctx);
    });

    it('accepts optional `cb` to be invoked with resolved `dir`', function (done) {
      var ctx = new RunContext(this.Dummy);
      var cb = sinon.spy(function () {
        sinon.assert.calledOnce(cb);
        sinon.assert.calledOn(cb, ctx);
        sinon.assert.calledWith(cb, path.resolve(this.tmp));
        done();
      }.bind(this));
      ctx.inDir(this.tmp, cb);
    });

    it('optional `cb` can use `this.async()` to delay execution', function (done) {
      var ctx = new RunContext(this.Dummy);
      var delayed = false;
      var cb = sinon.spy(function () {
        var release = this.async();
        setTimeout(function () {
          delayed = true;
          release();
        }.bind(this), 1);
      });
      ctx.inDir(this.tmp, cb)
        .on('ready', function () {
          assert(delayed);
          done();
        });
    });
  });

  describe('#withArguments()', function () {
    it('provide arguments to the generator when passed as Array', function (done) {
      this.ctx.withArguments(['one', 'two']);
      this.ctx.on('end', function () {
        assert.deepEqual(this.execSpy.firstCall.thisValue.arguments, ['one', 'two']);
        done();
      }.bind(this));
    });

    it('provide arguments to the generator when passed as String', function (done) {
      this.ctx.withArguments('foo bar');
      this.ctx.on('end', function () {
        assert.deepEqual(this.execSpy.firstCall.thisValue.arguments, ['foo', 'bar']);
        done();
      }.bind(this));
    });

    it('throws when arguments passed is neither a String or an Array', function () {
      assert.throws(this.ctx.withArguments.bind(this.ctx, { foo: 'bar' }));
    });

    it('is chainable', function (done) {
      this.ctx.withArguments('foo').withArguments('bar');
      this.ctx.on('end', function () {
        assert.deepEqual(this.execSpy.firstCall.thisValue.arguments, ['foo', 'bar']);
        done();
      }.bind(this));
    });
  });

  describe('#withOptions()', function () {
    it('provide options to the generator', function (done) {
      this.ctx.withOptions({ foo: 'bar' });
      this.ctx.on('end', function () {
        assert.equal(this.execSpy.firstCall.thisValue.options.foo, 'bar');
        done();
      }.bind(this));
    });

    it('set skip-install by default', function (done) {
      this.ctx.on('end', function () {
        assert.equal(this.execSpy.firstCall.thisValue.options['skip-install'], true);
        done();
      }.bind(this));
    });

    it('allow skip-install to be overriden', function (done) {
      this.ctx.withOptions({ 'skip-install': false });
      this.ctx.on('end', function () {
        assert.equal(this.execSpy.firstCall.thisValue.options['skip-install'], false);
        done();
      }.bind(this));
    });

    it('is chainable', function (done) {
      this.ctx.withOptions({ foo: 'bar' }).withOptions({ john: 'doe' });
      this.ctx.on('end', function () {
        var options = this.execSpy.firstCall.thisValue.options;
        assert.equal(options.foo, 'bar');
        assert.equal(options.john, 'doe');
        done();
      }.bind(this));
    });
  });

  describe('#withPrompts()', function () {
    it('is call automatically', function (done) {
      this.Dummy.prototype.askFor = function () {
        this.prompt({
          name: 'yeoman',
          type: 'input',
          message: 'Hey!',
          default: 'pass'
        }, function (answers) {
          assert.equal(answers.yeoman, 'pass');
          done();
        });
      };
    });

    it('mock the prompt', function (done) {
      this.Dummy.prototype.askFor = function () {
        this.prompt({
          name: 'yeoman',
          type: 'input',
          message: 'Hey!'
        }, function (answers) {
          assert.equal(answers.yeoman, 'yes please');
          done();
        });
      };
      this.ctx.withPrompts({ yeoman: 'yes please' });
    });

    it('is chainable', function (done) {
      this.Dummy.prototype.askFor = function () {
        this.prompt([{
          name: 'yeoman',
          type: 'input',
          message: 'Hey!'
        }, {
          name: 'yo',
          type: 'input',
          message: 'Yo!'
        }], function (answers) {
          assert.equal(answers.yeoman, 'yes please');
          assert.equal(answers.yo, 'yo man');
          done();
        });
      };
      this.ctx.withPrompts({ yeoman: 'yes please' }).withPrompts({ yo: 'yo man' });
    });
  });

  describe('#withGenerators()', function () {
    it('register paths', function (done) {
      this.ctx.withGenerators([
        path.join(__dirname, './fixtures/custom-generator-simple')
      ]).on('ready', function () {
        assert(this.ctx.env.get('simple:app'));
        done();
      }.bind(this));
    });

    it('register mocked generator', function (done) {
      this.ctx.withGenerators([
        [helpers.createDummyGenerator(), 'dummy:gen']
      ]).on('ready', function () {
        assert(this.ctx.env.get('dummy:gen'));
        done();
      }.bind(this));
    });

    it('allow multiple calls', function (done) {
      this.ctx.withGenerators([
        path.join(__dirname, './fixtures/custom-generator-simple')
      ]).withGenerators([
        [helpers.createDummyGenerator(), 'dummy:gen']
      ]).on('ready', function () {
        assert(this.ctx.env.get('dummy:gen'));
        assert(this.ctx.env.get('simple:app'));
        done();
      }.bind(this));
    });
  });
});
