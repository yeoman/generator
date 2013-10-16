/*global describe, before, it */
var path = require('path');
var fs = require('fs');
var events = require('events');
var assert = require('assert');
var wiring = require('../lib/actions/wiring');

describe('yeoman.generator.lib.actions.wiring', function () {
  before(function () {
    this.fixtures = path.join(__dirname, 'fixtures');
  });

  it('should generate a simple block', function () {
    var res = wiring.generateBlock('js', 'main.js', [
      'path/file1.js',
      'path/file2.js'
    ]);

    assert.equal(res.trim(), '<!-- build:js main.js -->\npath/file1.js,path/file2.js        <!-- endbuild -->');
  });

  it('should generate a simple block with search path', function () {
    var res = wiring.generateBlock('js', 'main.js', [
      'path/file1.js',
      'path/file2.js'
    ], '.tmp/');

    assert.equal(res.trim(), '<!-- build:js(.tmp/) main.js -->\npath/file1.js,path/file2.js        <!-- endbuild -->');
  });

  it('should generate block with multiple search paths', function () {
    var res = wiring.generateBlock('js', 'main.js', [
      'path/file1.js',
      'path/file2.js'
    ], ['.tmp/', 'dist/']);

    assert.equal(res.trim(), '<!-- build:js({.tmp/,dist/}) main.js -->\npath/file1.js,path/file2.js        <!-- endbuild -->');
  });

  it('should append js files to an html string', function () {
    var html = '<html><body></body></html>';
    var res = wiring.appendFiles(html, 'js', 'out/file.js', ['in/file1.js', 'in/file2.js']);
    var fixture = fs.readFileSync(path.join(this.fixtures, 'js_block.html'),
                                  'utf-8').trim();

    assert.equal(res, fixture);
  });

  it('appendFiles should work the same using the object syntax', function () {
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

  it('should append content in the right place', function () {
    var html = '<html><body><section><span></span></section></body></html>';
    var expected = '<html><body><section><span></span>TEST</section></body></html>';
    assert.equal(wiring.append(html, 'section', 'TEST'), expected);
    assert.equal(wiring.domUpdate(html, 'section', 'TEST', 'a'), expected);
  });

  it('should prepend content in the right place', function () {
    var html = '<html><body><section><span></span></section></body></html>';
    var expected = '<html><body><section>TEST<span></span></section></body></html>';
    assert.equal(wiring.prepend(html, 'section', 'TEST'), expected);
    assert.equal(wiring.domUpdate(html, 'section', 'TEST', 'p'), expected);
  });

  it('should replace content correctly', function () {
    var html = '<html><body><section><span></span></section></body></html>';
    var expected = '<html><body><section>TEST</section></body></html>';
    assert.equal(wiring.domUpdate(html, 'section', 'TEST', 'r'), expected);
  });

  it('should delete content correctly', function () {
    var html = '<html><body><section><span></span></section></body></html>';
    var expected = '<html><body></body></html>';
    assert.equal(wiring.domUpdate(html, 'section', 'TEST', 'd'), expected);
  });

  it('should append to files in the right place', function () {
    var html = '<html><body><section><span></span></section></body></html>';
    var expected = '<html><body><section><span></span>TEST</section></body></html>';
    var filepath = path.join(this.fixtures, 'append-prepend-to-file.html');

    fs.writeFileSync(filepath, html, 'utf-8');

    wiring.appendToFile(filepath, 'section', 'TEST');

    var actual = fs.readFileSync(filepath, 'utf-8').trim();

    assert.equal(actual, expected);

    fs.writeFileSync(filepath, html, 'utf-8');
  });

  it('should prepend to files in the right place', function () {
    var html = '<html><body><section><span></span></section></body></html>';
    var expected = '<html><body><section>TEST<span></span></section></body></html>';
    var filepath = path.join(this.fixtures, 'append-prepend-to-file.html');

    fs.writeFileSync(filepath, html, 'utf-8');

    wiring.prependToFile(filepath, 'section', 'TEST');

    var actual = fs.readFileSync(filepath, 'utf-8').trim();

    assert.equal(actual, expected);

    fs.writeFileSync(filepath, html, 'utf-8');
  });
});
