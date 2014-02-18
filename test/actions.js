/*global describe, before, after, it, afterEach, beforeEach */
'use strict';
var fs = require('fs');
var path = require('path');
var generators = require('..');
var log = require('../lib/util/log')();
var helpers = generators.test;
var assert = generators.assert;
var Conflicter = require('../lib/util/conflicter');
var win32 = process.platform === 'win32';

describe('yeoman.generators.Base', function () {
  before(helpers.setUpTestDirectory(path.join(__dirname, 'temp')));

  before(function () {
    var env = this.env = generators();
    env.registerStub(helpers.createDummyGenerator(), 'dummy');
    this.dummy = env.create('dummy');

    this.fixtures = path.join(__dirname, 'fixtures');
    this.dummy.sourceRoot(this.fixtures);
  });

  it('generator.prompt(defaults, prompts, cb)', function (done) {
    this.dummy.prompt([], function () {
      done();
    });
  });

  describe('generator.sourceRoot(root)', function () {
    it('should update the "_sourceRoot" property when root is given', function () {
      this.dummy.sourceRoot(this.fixtures);
      assert.equal(this.dummy._sourceRoot, this.fixtures);
    });

    it('should return the updated or current value of "_sourceRoot"', function () {
      assert.equal(this.dummy.sourceRoot(), this.fixtures);
    });
  });

  describe('generator.destinationRoot(root)', function () {
    it('should update the "_destinationRoot" property when root is given', function () {
      this.dummy.destinationRoot('.');
      assert.equal(this.dummy._destinationRoot, process.cwd());
    });

    it('should return the updated or current value of "_destinationRoot"', function () {
      assert.equal(this.dummy.destinationRoot(), process.cwd());
    });
  });

  describe('generator.cacheRoot()', function () {
    it('should show the cache root where yeoman stores all temp files, on a platform that follows XDG', function () {
      process.env.XDG_CACHE_HOME = '.';
      assert.equal(this.dummy.cacheRoot(), path.join(process.env.XDG_CACHE_HOME, 'yeoman'));
    });

    it('should show the cache root where yeoman stores all temp files, on a plateform that doesn\'t follow XDG', function () {
      if (process.env.XDG_CACHE_HOME) {
        delete process.env.XDG_CACHE_HOME;
      }
      assert.equal(this.dummy.cacheRoot(), path.join(process.env[win32 ? 'USERPROFILE' : 'HOME'], '.cache/yeoman'));
    });
  });

  describe('generator.copy(source, destination, process)', function () {
    before(function (done) {
      this.dummy.copy(path.join(__dirname, 'fixtures/foo.js'), 'write/to/bar.js');
      this.dummy.copy('foo.js', 'write/to/foo.js');
      this.dummy.copy('foo-copy.js');
      this.dummy.copy('yeoman-logo.png');
      this.dummy.copy(path.join(__dirname, 'fixtures/lodash-copy.js'), 'write/to/lodash.js');
      this.dummy.copy('foo-process.js', 'write/to/foo-process.js', function (contents) {
        contents = contents.replace('foo', 'bar');
        contents = contents.replace('\r\n', '\n');

        return contents;
      });

      var oldDestRoot = this.dummy.destinationRoot();
      this.dummy.destinationRoot('write/to');
      this.dummy.copy('foo.js', 'foo-destRoot.js');
      this.dummy.destinationRoot(oldDestRoot);
      this.dummy.conflicter.resolve(done);
    });

    it('should copy source files relative to the "sourceRoot" value', function (done) {
      fs.stat('write/to/foo.js', done);
    });

    it('should copy to destination files relative to the "destinationRoot" value', function (done) {
      fs.stat('write/to/foo-destRoot.js', done);
    });

    it('should allow absolute path, and prevent the relative paths join', function (done) {
      fs.stat('write/to/bar.js', done);
    });

    it('should allow to copy without using the templating (conficting with lodash/underscore)', function (done) {
      fs.stat('write/to/lodash.js', done);
    });

    it('should default the destination to the source filepath value', function (done) {
      fs.stat('foo-copy.js', done);
    });

    it('should retain executable mode on copied files', function (done) {
      // Don't run on windows
      if (process.platform === 'win32') { return done(); }

      fs.stat('write/to/bar.js', function (err, stats) {
        assert(stats.mode & 1 === 1, 'File should be executable.');
        done();
      });
    });

    it('should process source contents via function', function (done) {
      fs.readFile('write/to/foo-process.js', function (err, data) {
        if (err) throw err;
        assert.textEqual(String(data), 'var bar = \'foo\';\n');
        done();
      });
    });

    it('should not give a conflict on same binary files', function (done) {
      this.dummy.conflicter.force = true;
      this.dummy.conflicter.collision('yeoman-logo.png', fs.readFileSync(path.join(this.fixtures, 'yeoman-logo.png')), function (status) {
        assert.equal(status, 'identical');
        this.dummy.conflicter.force = false;
        done();
      }.bind(this));
    });
  });

  describe('generator.bulkCopy(source, destination, process)', function () {

    before(function () {
      this.dummy.bulkCopy(path.join(__dirname, 'fixtures/foo.js'), 'write/to/foo.js');
      this.dummy.bulkCopy(path.join(__dirname, 'fixtures/foo-template.js'), 'write/to/noProcess.js');
    });

    it('should copy a file', function (done) {
      fs.readFile('write/to/foo.js', function (err, data) {
        if (err) throw err;
        assert.textEqual(String(data), 'var foo = \'foo\';\n');
        done();
      });
    });

    it('should not run conflicter or template engine', function (done) {
      var self = this;
      fs.readFile('write/to/noProcess.js', function (err, data) {
        if (err) throw err;
        assert.textEqual(String(data), 'var <%= foo %> = \'<%= foo %>\';\n');
        self.dummy.bulkCopy(path.join(__dirname, 'fixtures/foo.js'), 'write/to/noProcess.js');
        fs.readFile('write/to/noProcess.js', function (err, data) {
          if (err) throw err;
          assert.textEqual(String(data), 'var foo = \'foo\';\n');
          done();
        });
      });
    });
  });

  describe('generator.read(filepath, encoding)', function () {
    it('should read files relative to the "sourceRoot" value', function () {
      var body = this.dummy.read('foo.js');
      assert.textEqual(body, 'var foo = \'foo\';' + '\n');
    });
    it('should allow absolute path, and prevent the relative paths join', function () {
      var body = this.dummy.read(path.join(__dirname, 'fixtures/foo.js'));
      assert.textEqual(body, 'var foo = \'foo\';' + '\n');
    });
  });

  describe('generator.write(filepath, content)', function () {
    before(function (done) {
      this.body = 'var bar = \'bar\';' + '\n';
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

  describe('#template()', function () {
    describe('without options', function () {

      before(function (done) {
        // Create file with weird permission for testing
        var permFileName = this.fixtures + '/perm-test.js';
        fs.writeFileSync(permFileName, 'var foo;', { mode: parseInt(733, 8) });

        this.dummy.foo = 'fooooooo';
        this.dummy.template('perm-test.js', 'write/to/perm-test.js');
        this.dummy.template('foo-template.js', 'write/to/from-template.js');
        this.dummy.template('foo-template.js');
        this.dummy.template('<%=foo%>-file.js');
        this.dummy.template('foo-template.js', 'write/to/<%=foo%>-directory/from-template.js', {
          foo: 'bar'
        });
        this.dummy.template('foo-template.js', 'write/to/from-template-bar.js', {
          foo: 'bar'
        });
        this.dummy.template('template-tags.jst', 'write/to/template-tags.js', {
          foo: 'bar',
          bar: 'foo'
        });
        this.dummy.conflicter.resolve(done);
      });

      after(function () {
        fs.unlinkSync(this.fixtures + '/perm-test.js');
      });

      it('copy and process source file to destination', function (done) {
        fs.stat('write/to/from-template.js', done);
      });

      it('defaults the destination to the source filepath value, relative to "destinationRoot" value', function () {
        var body = fs.readFileSync('foo-template.js', 'utf8');
        assert.textEqual(body, 'var fooooooo = \'fooooooo\';' + '\n');
      });

      it('process underscore templates with the passed-in data', function () {
        var body = fs.readFileSync('write/to/from-template-bar.js', 'utf8');
        assert.textEqual(body, 'var bar = \'bar\';' + '\n');
      });

      it('process underscore templates with the actual generator instance, when no data is given', function () {
        var body = fs.readFileSync('write/to/from-template.js', 'utf8');
        assert.textEqual(body, 'var fooooooo = \'fooooooo\';' + '\n');
      });

      it('parses `${}` tags', function () {
        var body = fs.readFileSync('write/to/template-tags.js', 'utf8');
        assert.textEqual(body, 'foo = bar\n');
      });

      it('process underscode templates in destination filename', function () {
        var body = fs.readFileSync('fooooooo-file.js', 'utf8');
        assert.textEqual(body, 'var fooooooo = \'fooooooo\';\n');
      });

      it('process underscore templates in destination path', function () {
        var body = fs.readFileSync('write/to/bar-directory/from-template.js', 'utf8');
        assert.textEqual(body, 'var bar = \'bar\';\n');
      });

      it('should keep file mode', function () {
        var originFileStat = fs.statSync(this.fixtures + '/perm-test.js');
        var bodyStat = fs.statSync('write/to/perm-test.js');
        assert.equal(originFileStat.mode, bodyStat.mode);
      });

    });

    describe('with options', function () {
      beforeEach(function (done) {
        this.src = 'template-setting.xml';
        this.dest = 'write/to/template-setting.xml';
        this.dummy.template(this.src, this.dest, { foo: 'bar' }, {
          evaluate: /\{\{([\s\S]+?)\}\}/g,
          interpolate: /\{\{=([\s\S]+?)\}\}/g,
          escape: /\{\{-([\s\S]+?)\}\}/g
        });
        this.dummy.conflicter.resolve(done);
      });

      it('uses tags specified in option', function () {
        var body = fs.readFileSync(this.dest, 'utf8');
        assert.textEqual(body, '<version>bar</version> <%= foo %>;\n');
      });
    });

    describe('with custom tags', function () {
      beforeEach(function (done) {
        this.src = 'custom-template-setting.xml';
        this.dest = 'write/to/custom-template-setting.xml';

        var oldEngineOptions = this.dummy.options.engine.options;

        this.dummy.options.engine.options = {
          detecter: /\{\{?[^\}]+\}\}/,
          matcher: /\{\{\{([^\}]+)\}\}/g,
          start: '{{',
          end: '}}'
        };

        this.dummy.template(this.src, this.dest, { foo: 'bar' }, {
          evaluate: /\{\{([\s\S]+?)\}\}/g,
          interpolate: /\{\{=([\s\S]+?)\}\}/g,
          escape: /\{\{-([\s\S]+?)\}\}/g
        });

        this.dummy.conflicter.resolve(done);

        this.dummy.options.engine.options = oldEngineOptions;
      });

      it('uses tags specified in option and engine', function () {
        var body = fs.readFileSync(this.dest, 'utf8');
        assert.textEqual(body, '<version>bar</version> {{ foo }}\n');
      });
    });
  });

  describe('generator.directory(source, destination, process)', function () {
    before(function (done) {
      this.dummy.directory('./dir-fixtures', 'directory');
      this.dummy.directory('./dir-fixtures');
      this.dummy.directory('./dir-fixtures', 'directory-processed', function (contents, source) {
        if (source.indexOf('foo-process.js') !== -1) {
          contents = contents.replace('foo', 'bar');
          contents = contents.replace('\r\n', '\n');
        }

        return contents;
      });
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
      fs.stat('dir-fixtures/foo-template.js', function (err) {
        if (err) {
          return done(err);
        }
        fs.stat('dir-fixtures/foo.js', done);
      });
    });

    it('should process underscore templates with the actual generator instance', function () {
      var body = fs.readFileSync('directory/foo-template.js', 'utf8');
      var foo = this.dummy.foo;
      assert.textEqual(body, 'var ' + foo + ' = \'' + foo + '\';\n');
    });

    it('should process source contents via function', function () {
      var body = fs.readFileSync('directory-processed/foo-process.js', 'utf8');
      assert.textEqual(body, 'var bar = \'foo\';\n');
    });

  });

  describe('generator.bulkDirectory(source, destination, process)', function () {
    before(function (done) {
      this.dummy.sourceRoot(this.fixtures);
      this.dummy.destinationRoot('.');
      // Create temp bulk operation files
      // These cannot just be in the repo or the other directory tests fail
      require('mkdirp').sync(this.fixtures + '/bulk-operation');
      for (var i = 0; i < 1000; i++) {
        fs.writeFileSync(this.fixtures + '/bulk-operation/' + i + '.js', i);
      }

      // Copy files without processing
      this.dummy.bulkDirectory('bulk-operation', 'bulk-operation');
      this.dummy.conflicter.resolve(done);
    });

    after(function () {
      // Now remove them
      for (var i = 0; i < 1000; i++) {
        fs.unlinkSync(this.fixtures + '/bulk-operation/' + i + '.js');
      }
      fs.rmdirSync(this.fixtures + '/bulk-operation');
    });

    it('should bulk copy one thousand files', function (done) {
      fs.readFile('bulk-operation/999.js', function (err, data) {
        if (err) throw err;
        assert.equal(data, '999');
        done();
      });
    });

    it('should check for conflict if directory already exists', function (done) {
      var oldConflicter = this.dummy.conflicter;
      var callCount = 0;
      var adapterMock = {
        prompt: function (config, cb) {
          cb({ overwrite: this.answer });
        },
        log: log,
        answer: null
      };

      adapterMock.answer = function (cb) {
        callCount++;
        assert(callCount, 1);
        this.dummy.conflicter = oldConflicter;
        cb();
      }.bind(this);
      this.dummy.conflicter = new Conflicter(adapterMock);

      this.dummy.bulkDirectory('bulk-operation', 'bulk-operation');
      this.dummy.conflicter.resolve(done);
    });
  });

  describe('generator.expandFiles', function () {
    before(function (done) {
      this.dummy.copy('foo.js', 'write/abc/abc.js');
      this.dummy.conflicter.resolve(done);
    });
    it('should return expand files', function () {
      var files = this.dummy.expandFiles('write/abc/**');
      assert.deepEqual(files, ['write/abc/abc.js']);
    });
    it('should return expand files', function () {
      var files = this.dummy.expandFiles('abc/**', { cwd: './write' });
      assert.deepEqual(files, ['abc/abc.js']);
    });
  });
});
