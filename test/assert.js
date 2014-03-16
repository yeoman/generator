/*global it, describe, before, beforeEach */

var path = require('path');
var assert = require('assert');
var yo = require('..');

var noop = function () {};

describe('yeoman.assert', function () {
  'use strict';

  beforeEach(function () {
    process.chdir(path.join(__dirname, './fixtures'));
  });

  it('extend native assert module', function () {
    yo.assert.implement(yo.assert, assert);
  });

  describe('.file()', function () {
    it('accept a file that exists', function () {
      assert.doesNotThrow(yo.assert.file.bind(yo.assert, 'testFile'));
    });

    it('accept an array of files all of which exist', function () {
      assert.doesNotThrow(yo.assert.file.bind(yo.assert, ['testFile', 'testFile2']));
    });

    it('reject a file that does not exist', function () {
      assert.throws(yo.assert.file.bind(yo.assert, 'etherealTestFile'));
    });

    it('reject multiple files one of which does not exist', function () {
      assert.throws(yo.assert.file.bind(yo.assert, ['testFile', 'intangibleTestFile']));
    });

    // DEPRECATED

    it('accept a file with content that matches reg', function () {
      assert.doesNotThrow(yo.assert.file.bind(yo.assert, 'testFile', /Roses are red/));
    });

    it('reject a file with content does not match reg', function () {
      assert.throws(yo.assert.file.bind(yo.assert, 'testFile', /Roses are blue/));
    });
  });

  describe('.noFile()', function () {
    it('accept a file that does not exist', function () {
      assert.doesNotThrow(yo.assert.noFile.bind(yo.assert, 'etherealTestFile'));
    });

    it('accept an array of files all of which do not exist', function () {
      assert.doesNotThrow(
        yo.assert.noFile.bind(yo.assert, ['etherealTestFile', 'intangibleTestFile']));
    });

    it('reject a file that exists', function () {
      assert.throws(yo.assert.noFile.bind(yo.assert, 'testFile'));
    });

    it('reject an array of files one of which exists', function () {
      assert.throws(
        yo.assert.noFile.bind(yo.assert, ['testFile', 'etherealTestFile']));
    });
  });

  describe('.files()', function () {  // DEPRECATED
    it('accept an array of files all of which exist', function () {
      assert.doesNotThrow(
        yo.assert.files.bind(yo.assert, ['testFile', 'testFile2']));
    });

    it('reject an array of multiple files one of which exists', function () {
      assert.throws(
        yo.assert.files.bind(yo.assert, ['testFile', 'etherealTestFile']));
    });

    it('accept an array of file/regex pairs when each file\'s content matches the corresponding regex', function () {
      var arg = [
        ['testFile', /Roses are red/],
        ['testFile2', /Violets are blue/]
      ];
      assert.doesNotThrow(yo.assert.files.bind(yo.assert, arg));
    });

    it('reject an array of file/regex pairs when one file\'s content does not matches the corresponding regex', function () {
      var arg = [
        ['testFile', /Roses are red/],
        ['testFile2', /Violets are orange/]
      ];
      assert.throws(yo.assert.files.bind(yo.assert, arg));
    });
  });

  describe('.fileContent()', function () {
    it('accept a file and regex when the file content matches the regex', function () {
      assert.doesNotThrow(yo.assert.fileContent.bind(yo.assert, 'testFile', /Roses are red/));
    });

    it('reject a file and regex when the file content does not match the regex', function () {
      assert.throws(yo.assert.fileContent.bind(yo.assert, 'testFile', /Roses are blue/));
    });

    it('accept an array of file/regex pairs when each file\'s content matches the corresponding regex', function () {
      var arg = [
        ['testFile', /Roses are red/],
        ['testFile2', /Violets are blue/]
      ];
      assert.doesNotThrow(yo.assert.fileContent.bind(yo.assert, arg));
    });

    it('reject an array of file/regex pairs when one file\'s content does not matches the corresponding regex', function () {
      var arg = [
        ['testFile', /Roses are red/],
        ['testFile2', /Violets are orange/]
      ];
      assert.throws(yo.assert.fileContent.bind(yo.assert, arg));
    });
  });

  describe('.noFileContent()', function () {
    it('accept a file and regex when the file content does not match the regex', function () {
      assert.doesNotThrow(yo.assert.noFileContent.bind(yo.assert, 'testFile', /Roses are blue/));
    });

    it('reject a file and regex when the file content matches the regex', function () {
      assert.throws(yo.assert.noFileContent.bind(yo.assert, 'testFile', /Roses are red/));
    });

    it('accept an array of file/regex pairs when each file\'s content does not match its corresponding regex', function () {
      var arg = [
        ['testFile', /Roses are green/],
        ['testFile2', /Violets are orange/]
      ];
      assert.doesNotThrow(yo.assert.noFileContent.bind(yo.assert, arg));
    });

    it('reject an array of file/regex pairs when one file\'s content does matches its corresponding regex', function () {
      var arg = [
        ['testFile', /Roses are red/],
        ['testFile2', /Violets are orange/]
      ];
      assert.throws(yo.assert.noFileContent.bind(yo.assert, arg));
    });
  });

  describe('.implement()', function () {
    beforeEach(function () {
      this.subject = { foo: noop, bar: noop };
      this.interfaceSome = ['foo'];
      this.interfaceComplete = ['foo', 'bar'];
      this.interfaceMore = ['foo', 'yo'];
    });

    it('pass if an object implement an interface', function () {
      assert.doesNotThrow(yo.assert.implement.bind(yo.assert, this.subject, this.interfaceSome));
      assert.doesNotThrow(yo.assert.implement.bind(yo.assert, this.subject, this.interfaceComplete));
    });

    it('fails if methods are missing', function () {
      assert.throws(yo.assert.implement.bind(yo.assert, this.subject, this.interfaceMore));
    });

    it('allow interface to be an object (using its object.keys)', function () {
      var interfacePass = { foo: noop };
      var interfaceFail = { yop: noop };
      assert.doesNotThrow(yo.assert.implement.bind(yo.assert, this.subject, interfacePass));
      assert.throws(yo.assert.implement.bind(yo.assert, this.subject, interfaceFail));
    });

    it('when object is passed in, it only check it implements the methods', function () {
      var expected = { foo: noop, yop: 'some arg' };
      assert.doesNotThrow(yo.assert.implement.bind(yo.assert, this.subject, expected));
    });
  });

  describe('.notImplement()', function () {
    beforeEach(function () {
      this.subject = { foo: noop, bar: noop };
      this.interfaceSome = ['foo'];
    });

    it('pass if an object doesn\'t implement an interface', function () {
      assert.doesNotThrow(yo.assert.notImplement.bind(yo.assert, this.subject, ['stuff']));
    });

    it('fails if methods are present', function () {
      assert.throws(yo.assert.notImplement.bind(yo.assert, this.subject, ['foo']));
    });
  });

});
