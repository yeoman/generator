/*global describe, before, beforeEach, it */
var path = require('path');
var fs = require('fs');
var events = require('events');
var assert = require('assert');
var file = require('file-utils');
var helpers = require('../lib/test/helpers');
var sinon = require('sinon');

var generators = require('..');
var Environment = require('../lib/env');


describe('Generators', function () {
  before(generators.test.before(path.join(__dirname, 'temp')));

  describe('module', function () {
    it('initialize new Environments', function () {
      assert.ok(generators() instanceof Environment);
      assert.notEqual(generators(), generators());
    });

    it('pass arguments to the Environment constructor', function() {
      var args = ['model', 'Post'];
      var opts = { help: true };
      var env = generators(args, opts);
      assert.equal(env.arguments, args);
      assert.equal(env.options, opts);
    });
  });

  describe('yeoman.generators', function () {
    it('should have a Base object to extend from', function () {
      assert.ok(generators.Base);
    });

    it('should have a NamedBase object to extend from', function () {
      assert.ok(generators.NamedBase);
    });
  });

  describe('yeoman.generators.Base', function () {
    beforeEach(function () {
      this.env = generators();
      this.generator = new generators.Base({
        env: this.env,
        resolved: 'test'
      });
    });

    it('should be an EventEmitter', function (done) {
      assert.ok(this.generator instanceof events.EventEmitter);
      assert.ok(typeof this.generator.on === 'function');
      assert.ok(typeof this.generator.emit === 'function');
      this.generator.on('yay-o-man', done);
      this.generator.emit('yay-o-man');
    });

    describe('.src', function () {
      it('implement the file-utils interface', function () {
        helpers.assertImplement(this.generator.src, file.constructor.prototype);
      });

      it('generator.sourcePath() update its source base', function () {
        this.generator.sourceRoot('foo/src');
        assert.ok(this.generator.src.fromBase('bar'), 'foo/src/bar');
      });

      it('generator.destinationPath() update its destination base', function () {
        this.generator.destinationRoot('foo/src');
        assert.ok(this.generator.src.fromDestBase('bar'), 'foo/src/bar');
      });
    });

    describe('.dest', function () {
      it('implement the file-utils interface', function () {
        helpers.assertImplement(this.generator.dest, file.constructor.prototype);
      });

      it('generator.sourcePath() update its destination base', function () {
        this.generator.sourceRoot('foo/src');
        assert.ok(this.generator.src.fromDestBase('bar'), 'foo/src/bar');
      });

      it('generator.destinationPath() update its source base', function () {
        this.generator.destinationRoot('foo/src');
        assert.ok(this.generator.src.fromBase('bar'), 'foo/src/bar');
      });

      describe('conflict handler', function () {
        var destRoot = path.join(__dirname, 'fixtures');
        var target = path.join(destRoot, 'file-conflict.txt');
        var initialFileContent = fs.readFileSync(target).toString();

        beforeEach(function () {
          this.generator.destinationRoot(destRoot);
          assert.ok(file.exists(target));
          helpers.assertTextEqual(initialFileContent, 'initial content\n');
        });

        it('aborting', function () {
          // make sure the file exist
          var fileContent = this.generator.dest.read('file-conflict.txt');
          var checkForCollision = sinon.stub(this.generator, 'checkForCollision');

          this.generator.dest.write('file-conflict.txt', 'some conficting content');

          var cb = checkForCollision.args[0][2];
          cb(null, {
            status: 'abort',
            callback: function () {}
          });

          assert.ok(checkForCollision.calledOnce);
          assert.ok(fileContent, this.generator.dest.read('file-conflict.txt'));
        });

        it('allowing', function () {
          // make sure the file exist
          var fileContent = this.generator.dest.read('file-conflict.txt');
          var checkForCollision = sinon.stub(this.generator, 'checkForCollision');

          this.generator.dest.write('file-conflict.txt', 'some conficting content');

          var cb = checkForCollision.args[0][2];
          cb(null, {
            status: 'create',
            callback: function () {}
          });

          assert.ok(checkForCollision.calledOnce);
          assert.ok('some conflicting content', this.generator.dest.read('file-conflict.txt'));

          // reset content
          fs.writeFileSync(target, initialFileContent);
        });
      });
    });
  });

  describe('yeoman.generators.NamedBase', function () {
    before(function () {
      this.env = generators();
      this.generator = new generators.NamedBase(['namedArg'], {
        env: this.env,
        resolved: 'namedbase:test'
      });
    });

    it('should be a Base generator', function () {
      assert.ok(this.generator instanceof generators.Base);
    });

    it('and it should have a name property', function () {
      assert.equal(this.generator.name, 'namedArg');
    });
  });
});
