/*global describe, before, after, it, afterEach, beforeEach */
'use strict';
var fs = require('fs');
var os = require('os');
var path = require('path');
var tmpdir = path.join(os.tmpdir(), 'yeoman-actions');
var TestAdapter = require('yeoman-test/lib/adapter').TestAdapter;
var generators = require('../');
var helpers = require('yeoman-test');
var assert = require('yeoman-assert');

describe('generators.Base (actions/actions)', function () {
  before(helpers.setUpTestDirectory(tmpdir));

  beforeEach(function () {
    var env = this.env = generators([], {}, new TestAdapter());
    var Dummy = generators.Base.extend({
      exec: function () {}
    });
    env.registerStub(Dummy, 'dummy');
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

  describe('#copy()', function () {
    beforeEach(function (done) {
      this.dummy.copy(path.join(__dirname, 'fixtures/foo.js'), 'write/to/bar.js');
      this.dummy.copy('foo.js', 'write/to/foo.js');
      this.dummy.copy('foo-copy.js');
      this.dummy.copy('yeoman-logo.png');

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

    it('defaults the destination to the source filepath value', function () {
      assert(fs.statSync(this.dummy.destinationPath('foo-copy.js')));
      assert(fs.statSync('yeoman-logo.png'));
    });

    it('retains executable mode on copied files', function (done) {
      // Don't run on windows
      if (process.platform === 'win32') {
        done();
        return;
      }

      fs.stat('write/to/bar.js', function (err, stats) {
        if (err) {
          throw err;
        }

        assert(stats.mode & 1 === 1, 'File be executable.');
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
        if (err) {
          throw err;
        }

        assert.textEqual(String(data), 'var foo = \'foo\';\n');
        done();
      });
    });

    it('does not run conflicter or template engine', function () {
      var data = fs.readFileSync('write/to/noProcess.js');
      assert.textEqual(String(data), 'var <%= foo %> = \'<%= foo %>\';\n<%%= extra %>\n');

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
      beforeEach(function (done) {
        // Create file with weird permission for testing
        var permFileName = this.fixtures + '/perm-test.js';
        fs.writeFileSync(permFileName, 'var foo;', { mode: parseInt(733, 8) });

        this.dummy.foo = 'fooooooo';
        this.dummy.template('perm-test.js', 'write/to/perm-test.js');
        this.dummy.template('foo-template.js', 'write/to/from-template.js');
        this.dummy.template('foo-template.js', { foo: 'bar' });

        this.dummy.template('foo-template.js', 'write/to/from-template-bar.js', {
          foo: 'bar'
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
        assert.textEqual(body, 'var bar = \'bar\';\n<%= extra %>\n');
      });

      it('process underscore templates with the passed-in data', function () {
        var body = fs.readFileSync('write/to/from-template-bar.js', 'utf8');
        assert.textEqual(body, 'var bar = \'bar\';\n<%= extra %>\n');
      });

      it('process underscore templates with the actual generator instance, when no data is given', function () {
        var body = fs.readFileSync('write/to/from-template.js', 'utf8');
        assert.textEqual(body, 'var fooooooo = \'fooooooo\';\n<%= extra %>\n');
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
          delimiter: '?'
        });
        this.dummy._writeFiles(done);
      });

      it('uses tags specified in option', function () {
        var body = fs.readFileSync(this.dest, 'utf8');
        assert.textEqual(body, '<version>bar</version> <%= foo %>;\n');
      });
    });
  });

  describe('#directory()', function () {
    before(function (done) {
      this.dummy.directory('./dir-fixtures', 'directory');
      this.dummy.directory('./dir-fixtures');
      this.dummy._writeFiles(done);
    });

    it('copy and process source files to destination', function (done) {
      fs.stat('directory/foo-template.js', function (err) {
        if (err) {
          done(err);
          return;
        }

        fs.stat('directory/foo.js', done);
      });
    });

    it('defaults the destination to the source filepath value, relative to "destinationRoot" value', function (done) {
      fs.stat('dir-fixtures/foo-template.js', function (err) {
        if (err) {
          done(err);
          return;
        }

        fs.stat('dir-fixtures/foo.js', done);
      });
    });

    it('process underscore templates with the actual generator instance', function () {
      var body = fs.readFileSync('directory/foo-template.js', 'utf8');
      var foo = this.dummy.foo;
      assert.textEqual(body, 'var ' + foo + ' = \'' + foo + '\';\n');
    });
  });

  describe('#bulkDirectory()', function () {
    before(function (done) {
      this.dummy.sourceRoot(this.fixtures);
      this.dummy.destinationRoot('.');
      this.dummy.conflicter.force = true;
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
        if (err) {
          throw err;
        }

        assert.equal(data, '999');
        done();
      });
    });

    it('check for conflict if directory already exists', function (done) {
      this.dummy.conflicter.force = true;
      this.dummy.bulkDirectory('bulk-operation', 'bulk-operation');
      this.dummy.conflicter.resolve(done);
    });
  });
});
