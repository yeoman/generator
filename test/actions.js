/*global describe, before, it */
var fs = require('fs');
var path = require('path');
var util = require('util');
var events = require('events');
var assert = require('assert');
var proxyquire = require('proxyquire');
var generators = require('../');
var eol = require('os').EOL;


describe('yeoman.generators.Base', function () {
  before(generators.test.before(path.join(__dirname, 'temp')));

  before(function () {
    function Dummy() {
      generators.Base.apply(this, arguments);
    }

    util.inherits(Dummy, generators.Base);

    Dummy.prototype.test = function () {
      this.shouldRun = true;
    };

    var env = this.env = generators();
    env.register(Dummy, 'dummy');
    this.dummy = env.create('dummy');

    this.fixtures = path.join(__dirname, 'fixtures');
  });

  it('generator.prompt(defaults, prompts, cb)', function (done) {
    this.dummy.prompt([], done);
  });

  describe('generator.sourceRoot(root)', function () {
    it('should update the "_sourceRoot" property when root is given', function () {
      this.dummy.sourceRoot(this.fixtures);
      assert.equal(this.dummy._sourceRoot, this.fixtures);
    });

    it('should return the uddated or current value of "_sourceRoot"', function () {
      assert.equal(this.dummy.sourceRoot(), this.fixtures);
    });
  });

  describe('generator.destinationRoot(root)', function () {
    it('should update the "_destinationRoot" property when root is given', function () {
      this.dummy.destinationRoot('.');
      assert.equal(this.dummy._destinationRoot, process.cwd());
    });

    it('should return the uddated or current value of "_destinationRoot"', function () {
      assert.equal(this.dummy.destinationRoot(), process.cwd());
    });
  });

  describe('generator.copy(source, destination, options)', function () {
    before(function (done) {
      this.dummy.copy(path.join(__dirname, 'fixtures/foo.js'), 'write/to/bar.js');
      this.dummy.copy('foo.js', 'write/to/foo.js');
      this.dummy.copy(path.join(__dirname, 'fixtures/lodash-copy.js'), 'write/to/lodash.js');
      this.dummy.conflicter.resolve(done);
    });

    it('should copy source files relative to the "sourceRoot" value', function (done) {
      fs.stat('write/to/foo.js', done);
    });

    it('should allow absolute path, and prevent the relative paths join', function (done) {
      fs.stat('write/to/bar.js', done);
    });

    it('should allow to copy without using the templating (conficting with lodash/underscore)', function (done) {
      fs.stat('write/to/lodash.js', done);
    });
  });

  describe('generator.read(filepath, encoding)', function () {
    it('should read files relative to the "sourceRoot" value', function () {
      var body = this.dummy.read('foo.js');
      assert.equal(body, 'var foo = \'foo\';' + eol);
    });
    it('should allow absolute path, and prevent the relative paths join', function () {
      var body = this.dummy.read(path.join(__dirname, 'fixtures/foo.js'));
      assert.equal(body, 'var foo = \'foo\';' + eol);
    });
  });

  describe('generator.write(filepath, content)', function () {
    before(function (done) {
      this.body = 'var bar = \'bar\';' + eol;
      this.dummy.write('write/to/foobar.js', this.body);
      this.dummy.conflicter.resolve(done);
    });

    it('should write the specified files relative to the "destinationRoot" value', function (done) {
      var body = this.body;
      fs.readFile('write/to/foobar.js', 'utf8', function (err, actual) {
        if (err) {
          return done(err);
        }
        assert.ok(actual, body);
        done();
      });
    });
  });

  describe('generator.template(source, destination, data)', function () {
    before(function (done) {
      this.dummy.foo = 'fooooooo';
      this.dummy.template('foo-template.js', 'write/to/from-template.js');
      this.dummy.template('foo-template.js');
      this.dummy.template('foo-template.js', 'write/to/from-template-bar.js', {
        foo: 'bar'
      });
      this.dummy.template('foo-template.js', 'write/to/from-template.js');
      this.dummy.conflicter.resolve(done);
    });

    it('should copy and process source file to destination', function (done) {
      fs.stat('write/to/from-template.js', done);
    });

    it('should defaults the destination to the source filepath value, relative to "destinationRoot" value', function () {
      var body = fs.readFileSync('foo-template.js', 'utf8');
      assert.equal(body, 'var fooooooo = \'fooooooo\';' + eol);
    });

    it('should process underscore templates with the passed-in data', function () {
      var body = fs.readFileSync('write/to/from-template-bar.js', 'utf8');
      assert.equal(body, 'var bar = \'bar\';' + eol);
    });

    it('should process underscore templates with the actual generator instance, when no data is given', function () {
      var body = fs.readFileSync('write/to/from-template.js', 'utf8');
      assert.equal(body, 'var fooooooo = \'fooooooo\';' + eol);
    });
  });

  describe('generator.directory(source, destination)', function () {
    before(function (done) {
      // avoid hitting conflict state in this configuration for now
      if (fs.existsSync('foo.js')) {
        fs.unlinkSync('foo.js');
      }

      // avoid hitting conflict state in this configuration for now
      if (fs.existsSync('foo-template.js')) {
        fs.unlinkSync('foo-template.js');
      }

      this.dummy.directory('./', 'directory');
      this.dummy.directory('./');
      this.dummy.conflicter.resolve(done);
    });

    it('should copy and process source files to destination', function (done) {
      fs.stat('directory/foo-template.js', function (err) {
        if (err) {
          return done(err);
        }
        fs.stat('directory/foo.js', done);
      });
    });

    it('should defaults the destination to the source filepath value, relative to "destinationRoot" value', function (done) {
      fs.stat('foo-template.js', function (err) {
        if (err) {
          return done(err);
        }
        fs.stat('foo.js', done);
      });
    });

    it('should process underscore templates with the actual generator instance', function () {
      var body = fs.readFileSync('directory/foo-template.js', 'utf8');
      var foo = this.dummy.foo;
      assert.equal(body, 'var ' + foo + ' = \'' + foo + '\';' + eol);
    });
  });

  describe('actions/install', function () {
    var asyncStub = {
      on: function (key, cb) {
        if (key === 'exit') {
          cb();
        }
        return asyncStub;
      }
    };

    describe('generator.bowerInstall', function () {
      it('should spawn a bower process', function (done) {
        var called = false;

        function spawn(cmd, args) {
          assert.equal(cmd, 'bower');
          assert.deepEqual(args, ['install']);
          called = true;

          return asyncStub;
        }

        var install = proxyquire('../lib/actions/install', {
          child_process: {spawn: spawn}
        });

        install.emit = function () {};
        install.bowerInstall(null, done);
        assert(called);
      });

      it('should spawn a bower process with formatted options', function (done) {
        var called = false;

        function spawn(cmd, args) {
          assert.equal(cmd, 'bower');
          assert.deepEqual(args, ['install', 'jquery', '--save-dev']);
          called = true;

          return asyncStub;
        }

        var install = proxyquire('../lib/actions/install', {
          child_process: {spawn: spawn}
        });

        install.emit = function () {};
        install.bowerInstall('jquery', {saveDev: true}, done);
        assert(called);
      });
    });

    describe('generator.installDependencies', function () {
      it('should spawn npm and bower', function () {
        var commandsRun = [];

        function spawn(cmd, args) {
          commandsRun.push(cmd);
          return asyncStub;
        }

        var install = proxyquire('../lib/actions/install', {
          child_process: {spawn: spawn}
        });

        install.emit = function () {};
        install.installDependencies();
        assert.deepEqual(commandsRun.sort(), ['bower', 'npm']);
      });

      it('should not spawn anything with skipInstall', function () {
        var commandsRun = [];

        function spawn(cmd, args) {
          commandsRun.push(cmd);
          return asyncStub;
        }

        var install = proxyquire('../lib/actions/install', {
          child_process: {spawn: spawn}
        });

        install.installDependencies.call(this.dummy, { skipInstall: true });
        assert.deepEqual(commandsRun.length, 0);
      });

    });
  });
});
