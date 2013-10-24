/*global describe before it */
var path = require('path');
var events = require('events');
var assert = require('assert');

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
    before(function () {
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
