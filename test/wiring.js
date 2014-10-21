/*global describe, before, it */
'use strict';
var path = require('path');
var fs = require('fs');
var wiring = require('../lib/actions/wiring');
var yeoman = require('..');
var assert = yeoman.assert;

describe('generators.Base (actions/wiring)', function () {
  before(function () {
    this.fixtures = path.join(__dirname, 'fixtures');
  });

  it('generate a simple block', function () {
    var res = wiring.generateBlock('js', 'main.js', [
      'path/file1.js',
      'path/file2.js'
    ]);

    assert.equal(res.trim(), '<!-- build:js main.js -->\npath/file1.js,path/file2.js        <!-- endbuild -->');
  });

  it('generate a simple block with search path', function () {
    var res = wiring.generateBlock('js', 'main.js', [
      'path/file1.js',
      'path/file2.js'
    ], '.tmp/');

    assert.equal(res.trim(), '<!-- build:js(.tmp/) main.js -->\npath/file1.js,path/file2.js        <!-- endbuild -->');
  });

  it('generate block with multiple search paths', function () {
    var res = wiring.generateBlock('js', 'main.js', [
      'path/file1.js',
      'path/file2.js'
    ], ['.tmp/', 'dist/']);

    assert.equal(res.trim(), '<!-- build:js({.tmp/,dist/}) main.js -->\npath/file1.js,path/file2.js        <!-- endbuild -->');
  });

  it('append js files to an html string', function () {
    var html = '<html><body></body></html>';
    var res = wiring.appendFiles(html, 'js', 'out/file.js', ['in/file1.js', 'in/file2.js']);
    var fixture = fs.readFileSync(path.join(this.fixtures, 'js_block.html'),
                                  'utf-8').trim();

    assert.textEqual(res, fixture);
  });

  it('appendFiles work the same using the object syntax', function () {
    var html = '<html><body></body></html>';
    var res = wiring.appendFiles(html, 'js', 'out/file.js', ['in/file1.js', 'in/file2.js']);
    var res2 = wiring.appendFiles({
      html: html,
      fileType: 'js',
      optimizedPath: 'out/file.js',
      sourceFileList: ['in/file1.js', 'in/file2.js']
    });

    assert.equal(res, res2);
  });

  it('append content in the right place', function () {
    var html = '<html><body><section><span></span></section></body></html>';
    var expected = '<html><body><section><span></span>TEST</section></body></html>';
    assert.equal(wiring.append(html, 'section', 'TEST'), expected);
    assert.equal(wiring.domUpdate(html, 'section', 'TEST', 'a'), expected);
  });

  it('prepend content in the right place', function () {
    var html = '<html><body><section><span></span></section></body></html>';
    var expected = '<html><body><section>TEST<span></span></section></body></html>';
    assert.equal(wiring.prepend(html, 'section', 'TEST'), expected);
    assert.equal(wiring.domUpdate(html, 'section', 'TEST', 'p'), expected);
  });

  it('replace content correctly', function () {
    var html = '<html><body><section><span></span></section></body></html>';
    var expected = '<html><body><section>TEST</section></body></html>';
    assert.equal(wiring.domUpdate(html, 'section', 'TEST', 'r'), expected);
  });

  it('delete content correctly', function () {
    var html = '<html><body><section><span></span></section></body></html>';
    var expected = '<html><body></body></html>';
    assert.equal(wiring.domUpdate(html, 'section', 'TEST', 'd'), expected);
  });

  it('append to files in the right place', function () {
    var html = '<html><body><section><span></span></section></body></html>';
    var expected = '<html><body><section><span></span>TEST</section></body></html>';
    var filepath = path.join(this.fixtures, 'append-prepend-to-file.html');

    fs.writeFileSync(filepath, html, 'utf-8');

    wiring.appendToFile(filepath, 'section', 'TEST');

    var actual = fs.readFileSync(filepath, 'utf-8').trim();

    assert.equal(actual, expected);

    fs.writeFileSync(filepath, html, 'utf-8');
  });

  it('prepend to files in the right place', function () {
    var html = '<html><body><section><span></span></section></body></html>';
    var expected = '<html><body><section>TEST<span></span></section></body></html>';
    var filepath = path.join(this.fixtures, 'append-prepend-to-file.html');

    fs.writeFileSync(filepath, html, 'utf-8');

    wiring.prependToFile(filepath, 'section', 'TEST');

    var actual = fs.readFileSync(filepath, 'utf-8').trim();

    assert.equal(actual, expected);

    fs.writeFileSync(filepath, html, 'utf-8');
  });

  it('handle with non-ascii characters well',function () {
    var html = '<html><body><p></p></body></html>';
    var expected = '<html><body><p>Hello World!你好世界!ハローワールド!안녕 하세요 세계!</p></body></html>';
    assert.equal(wiring.domUpdate(html, 'p', 'Hello World!你好世界!ハローワールド!안녕 하세요 세계!', 'p'), expected);
  });

  describe('#appendFiles()', function () {
    it('work the same using the object syntax', function () {
      var html = '<html><body></body></html>';
      var res = wiring.appendFiles(html, 'js', 'out/file.js', ['in/file1.js', 'in/file2.js']);
      var res2 = wiring.appendFiles({
        html: html,
        fileType: 'js',
        optimizedPath: 'out/file.js',
        sourceFileList: ['in/file1.js', 'in/file2.js']
      });

      assert.equal(res, res2);
    });

    it('work with css file', function () {
      var html = '<html><head></head></html>';
      var res = wiring.appendFiles(html, 'css', 'out/file.css', ['in/file1.css', 'in/file2.css']);
      var fixture = fs.readFileSync(path.join(this.fixtures, 'css_block.html'), 'utf-8').trim();

      assert.textEqual(res, fixture);
    });

    it('work with attributes params', function () {
      var html = '<html><body></body></html>';
      var res = wiring.appendFiles({
        html: html,
        fileType: 'js',
        optimizedPath: 'out/file.js',
        sourceFileList: ['in/file1.js', 'in/file2.js'],
        attrs: {
          'data-test': 'my-attr'
        }
      });
      var fixture = fs.readFileSync(path.join(this.fixtures, 'js_block_with_attr.html'), 'utf-8').trim();

      assert.textEqual(res, fixture);
    });
  });

  describe('#appendScripts()', function () {
    it('append scripts', function () {
      var html = '<html><body></body></html>';
      var res = wiring.appendScripts(html, 'out/file.js', ['in/file1.js', 'in/file2.js']);
      var fixture = fs.readFileSync(path.join(this.fixtures, 'js_block.html'), 'utf-8').trim();
      assert.textEqual(res, fixture);
    });
  });

  describe('#removeScript()', function () {
    it('remove script', function () {
      var withScript = '<html><body><script src="file1.js"></script></body></html>';
      var html = '<html><body></body></html>';

      var res = wiring.removeScript(withScript, 'file1.js');
      assert.textEqual(res, html);
    });
  });

  describe('#appendStyles()', function () {
    it('append styles', function () {
      var html = '<html><head></head></html>';
      var res = wiring.appendStyles(html, 'out/file.css', ['in/file1.css', 'in/file2.css']);
      var fixture = fs.readFileSync(path.join(this.fixtures, 'css_block.html'), 'utf-8').trim();

      assert.textEqual(res, fixture);
    });
  });

  describe('#removeStyle()', function () {
    it('remove style', function () {
      var withStyle = '<html><head><link rel="stylesheet" href="file1.css"></head></html>';
      var html = '<html><head></head></html>';

      var res = wiring.removeStyle(withStyle, 'file1.css');

      assert.textEqual(res, html);
    });
  });

  describe('#appendScriptsDir()', function () {
    it('append scripts directory', function () {
      var html = '<html><body></body></html>';
      var res = wiring.appendScriptsDir(html, 'out/file.js', path.join(__dirname, 'fixtures/dir-fixtures'));
      var fixture = fs.readFileSync(path.join(this.fixtures, 'js_block_dir.html'), 'utf-8').trim();

      assert.textEqual(res, fixture);
    });
  });

  describe('#appendStylesDir()', function () {
    it('append styles directory', function () {
      var html = '<html><head></head></html>';
      var res = wiring.appendStylesDir(html, 'out/file.css', path.join(__dirname, 'fixtures/dir-css-fixtures'));
      var fixture = fs.readFileSync(path.join(this.fixtures, 'css_block_dir.html'), 'utf-8').trim();

      assert.textEqual(res, fixture);
    });
  });
});
