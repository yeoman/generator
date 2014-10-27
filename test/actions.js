/*global describe, before, after, it, afterEach, beforeEach */
'use strict';
var fs = require('fs');
var os = require('os');
var path = require('path');
var sinon = require('sinon');
var generators = require('..');
var helpers = generators.test;
var assert = generators.assert;
var Conflicter = require('../lib/util/conflicter');
var TestAdapter = require('../lib/test/adapter').TestAdapter;
var tmpdir = path.join(os.tmpdir(), 'yeoman-actions');

describe('generators.Base (actions/actions)', function () {
  before(helpers.setUpTestDirectory(tmpdir));

  beforeEach(function () {
    var env = this.env = generators([], {}, new TestAdapter());
    env.registerStub(helpers.createDummyGenerator(), 'dummy');
    this.dummy = env.create('dummy');

    this.fixtures = path.join(__dirname, 'fixtures');
    this.dummy.sourceRoot(this.fixtures);
    this.dummy.foo = 'bar';
  });

  describe('#sourceRoot()', function () {
    it('updates the "_sourceRoot" property when root is given', function () {
      this.dummy.sourceRoot(this.fixtures);
      assert.equal(this.dummy._sourceRoot, this.fixtures);
    });

    it('returns the updated or current value of "_sourceRoot"', function () {
      assert.equal(this.dummy.sourceRoot(), this.fixtures);
    });
  });

  describe('#destinationRoot()', function () {
    it('updates the "_destinationRoot" property when root is given', function () {
      this.dummy.destinationRoot('.');
      assert.equal(this.dummy._destinationRoot, process.cwd());
    });

    it('returns the updated or current value of "_destinationRoot"', function () {
      assert.equal(this.dummy.destinationRoot(), process.cwd());
    });
  });

  describe('#cacheRoot()', function () {
    it('returns the cache root where yeoman stores all temp files', function () {
      assert(/yeoman$/.test(this.dummy.cacheRoot()));
    });
  });

  describe('#copy()', function () {
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
      this.dummy._writeFiles(done);
    });

    it('copy source files relative to the "sourceRoot" value', function (done) {
      fs.stat('write/to/foo.js', done);
    });

    it('copy to destination files relative to the "destinationRoot" value', function (done) {
      fs.stat('write/to/foo-destRoot.js', done);
    });

    it('allow absolute path, and prevent the relative paths join', function (done) {
      fs.stat('write/to/bar.js', done);
    });

    it('allow to copy without using the templating (conficting with lodash/underscore)', function (done) {
      fs.stat('write/to/lodash.js', done);
    });

    it('defaults the destination to the source filepath value', function (done) {
      fs.stat('foo-copy.js', done);
    });

    it('retains executable mode on copied files', function (done) {
      // Don't run on windows
      if (process.platform === 'win32') return done();

      fs.stat('write/to/bar.js', function (err, stats) {
        if (err) throw err;
        assert(stats.mode & 1 === 1, 'File be executable.');
        done();
      });
    });

    it('process source contents via function', function (done) {
      fs.readFile('write/to/foo-process.js', function (err, data) {
        if (err) throw err;
        assert.textEqual(String(data), 'var bar = \'foo\';\n');
        done();
      });
    });
  });

  describe('#bulkCopy()', function () {
    before(function () {
      this.dummy.bulkCopy(path.join(__dirname, 'fixtures/foo.js'), 'write/to/foo.js');
      this.dummy.bulkCopy(path.join(__dirname, 'fixtures/foo-template.js'), 'write/to/noProcess.js');
    });

    it('copy a file', function (done) {
      fs.readFile('write/to/foo.js', function (err, data) {
        if (err) throw err;
        assert.textEqual(String(data), 'var foo = \'foo\';\n');
        done();
      });
    });

    it('does not run conflicter or template engine', function () {
      var data = fs.readFileSync('write/to/noProcess.js');
      assert.textEqual(String(data), 'var <%= foo %> = \'<%= foo %>\';\n');

      this.dummy.bulkCopy(path.join(__dirname, 'fixtures/foo.js'), 'write/to/noProcess.js');
      var data2 = fs.readFileSync('write/to/noProcess.js');
      assert.textEqual(String(data2), 'var foo = \'foo\';\n');
    });
  });

  describe('#read()', function () {
    it('read files relative to the "sourceRoot" value', function () {
      var body = this.dummy.read('foo.js');
      assert.textEqual(body, 'var foo = \'foo\';' + '\n');
    });

    it('allow absolute path, and prevent the relative paths join', function () {
      var body = this.dummy.read(path.join(__dirname, 'fixtures/foo.js'));
      assert.textEqual(body, 'var foo = \'foo\';' + '\n');
    });
  });

  describe('#write()', function () {
    before(function (done) {
      this.body = 'var bar = \'bar\';' + '\n';
      this.dummy.write('write/to/foobar.js', this.body);
      this.dummy._writeFiles(done);
    });

    it('writes the specified files relative to the "destinationRoot" value', function () {
      var body = this.body;
      var actual = fs.readFileSync('write/to/foobar.js', 'utf8');
      assert.ok(actual, body);
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
        this.dummy._writeFiles(done);
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

      it('keep file mode', function () {
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
        this.dummy._writeFiles(done);
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
        this.spy = sinon.spy();

        var oldEngineOptions = this.dummy.options.engine.options;

        this.dummy.options.engine.options = {
          detecter: /\{\{?[^\}]+\}\}/,
          matcher: /\{\{\{([^\}]+)\}\}/g,
          start: '{{',
          end: '}}'
        };

        this.dummy.template(this.src, this.dest, {
          foo: 'bar',
          spy: this.spy
        }, {
          evaluate: /\{\{([\s\S]+?)\}\}/g,
          interpolate: /\{\{=([\s\S]+?)\}\}/g,
          escape: /\{\{-([\s\S]+?)\}\}/g
        });

        this.dummy.options.engine.options = oldEngineOptions;
        this.dummy._writeFiles(done);
      });

      it('uses tags specified in option and engine', function () {
        var body = fs.readFileSync(this.dest, 'utf8');
        assert.textEqual(body, '<version>bar</version>\n');
        sinon.assert.calledOnce(this.spy);
      });
    });
  });

  describe('#directory()', function () {
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
      this.dummy._writeFiles(done);
    });

    it('copy and process source files to destination', function (done) {
      fs.stat('directory/foo-template.js', function (err) {
        if (err) {
          return done(err);
        }
        fs.stat('directory/foo.js', done);
      });
    });

    it('defaults the destination to the source filepath value, relative to "destinationRoot" value', function (done) {
      fs.stat('dir-fixtures/foo-template.js', function (err) {
        if (err) {
          return done(err);
        }
        fs.stat('dir-fixtures/foo.js', done);
      });
    });

    it('process underscore templates with the actual generator instance', function () {
      var body = fs.readFileSync('directory/foo-template.js', 'utf8');
      var foo = this.dummy.foo;
      assert.textEqual(body, 'var ' + foo + ' = \'' + foo + '\';\n');
    });

    it('process source contents via function', function () {
      var body = fs.readFileSync('directory-processed/foo-process.js', 'utf8');
      assert.textEqual(body, 'var bar = \'foo\';\n');
    });

  });

  describe('#bulkDirectory()', function () {
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

    it('bulk copy one thousand files', function (done) {
      fs.readFile('bulk-operation/999.js', function (err, data) {
        if (err) throw err;
        assert.equal(data, '999');
        done();
      });
    });

    it('check for conflict if directory already exists', function (done) {
      var oldConflicter = this.dummy.conflicter;
      var callCount = 0;
      var dummyGenerator = this.dummy;
      var answers = {
        overwrite: function (cb) {
          callCount++;
          assert(callCount, 1);
          dummyGenerator.conflicter = oldConflicter;
          cb();
        }
      };

      this.dummy.conflicter = new Conflicter(new TestAdapter(answers));
      this.dummy.bulkDirectory('bulk-operation', 'bulk-operation');
      this.dummy.conflicter.resolve(done);
    });
  });

  describe('#expandFiles()', function () {
    before(function (done) {
      this.dummy.copy('foo.js', 'write/abc/abc.js');
      this.dummy._writeFiles(done);
    });
    it('returns expand files', function () {
      var files = this.dummy.expandFiles('write/abc/**');
      assert.deepEqual(files, ['write/abc/abc.js']);
    });
    it('returns expand files', function () {
      var files = this.dummy.expandFiles('abc/**', { cwd: './write' });
      assert.deepEqual(files, ['abc/abc.js']);
    });
  });
});
