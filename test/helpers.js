/*global it, describe, before, beforeEach */

var util = require('util');
var path = require('path');
var fs = require('fs');
var assert = require('assert');
var yeoman = require('..');
var helpers = yeoman.test;

describe('yeoman.test', function () {
  'use strict';

  beforeEach(function () {
    process.chdir(path.join(__dirname, './fixtures'));
    var self = this;
    this.StubGenerator = function (args, options) {
      self.args = args;
      self.options = options;
    };
    util.inherits(this.StubGenerator, yeoman.Base);
  });

  describe('#createGenerator', function () {
    it('create a new generator', function () {
      var generator = helpers.createGenerator('unicorn:app', [
        [this.StubGenerator, 'unicorn:app']
      ]);
      assert.ok(generator instanceof this.StubGenerator);
    });

    it('pass args params to the generator', function () {
      helpers.createGenerator('unicorn:app', [
        [this.StubGenerator, 'unicorn:app']
      ], ['temp']);
      assert.deepEqual(this.args, ['temp']);
    });

    it('pass options param to the generator', function () {
      helpers.createGenerator('unicorn:app', [
        [this.StubGenerator, 'unicorn:app']
      ], ['temp'], { ui: 'tdd' });
      assert.equal(this.options.ui, 'tdd');
    });
  });

  describe('#assertFile', function () {

    it('accept a file that exists', function () {
      assert.doesNotThrow(helpers.assertFile.bind(helpers, 'testFile'));
    });

    it('accept an array of files all of which exist', function () {
      assert.doesNotThrow(helpers.assertFile.bind(helpers, ['testFile', 'testFile2']));
    });

    it('reject a file that does not exist', function () {
      assert.throws(helpers.assertFile.bind(helpers, 'etherealTestFile'));
    });

    it('reject multiple files one of which does not exist', function () {
      assert.throws(helpers.assertFile.bind(helpers, ['testFile', 'intangibleTestFile']));
    });

    // DEPRECATED

    it('accept a file with content that matches reg', function () {
      assert.doesNotThrow(helpers.assertFile.bind(helpers, 'testFile', /Roses are red/));
    });

    it('reject a file with content does not match reg', function () {
      assert.throws(helpers.assertFile.bind(helpers, 'testFile', /Roses are blue/));
    });

  });

  describe('#assertNoFile', function () {

    it('accept a file that does not exist', function () {
      assert.doesNotThrow(helpers.assertNoFile.bind(helpers, 'etherealTestFile'));
    });

    it('accept an array of files all of which do not exist', function () {
      assert.doesNotThrow(
        helpers.assertNoFile.bind(helpers, ['etherealTestFile', 'intangibleTestFile']));
    });

    it('reject a file that exists', function () {
      assert.throws(helpers.assertNoFile.bind(helpers, 'testFile'));
    });

    it('reject an array of files one of which exists', function () {
      assert.throws(
        helpers.assertNoFile.bind(helpers, ['testFile', 'etherealTestFile']));
    });

  });

  describe('#assertFiles', function () {  // DEPRECATED

    it('accept an array of files all of which exist', function () {
      assert.doesNotThrow(
        helpers.assertFiles.bind(helpers, ['testFile', 'testFile2']));
    });

    it('reject an array of multiple files one of which exists', function () {
      assert.throws(
        helpers.assertFiles.bind(helpers, ['testFile', 'etherealTestFile']));
    });

    it('accept an array of file/regex pairs when each file\'s content matches the corresponding regex', function () {
      var arg = [
        ['testFile', /Roses are red/],
        ['testFile2', /Violets are blue/]
      ];
      assert.doesNotThrow(helpers.assertFiles.bind(helpers, arg));
    });

    it('reject an array of file/regex pairs when one file\'s content does not matches the corresponding regex', function () {
      var arg = [
        ['testFile', /Roses are red/],
        ['testFile2', /Violets are orange/]
      ];
      assert.throws(helpers.assertFiles.bind(helpers, arg));
    });

  });

  describe('#assertFileContent', function () {

    it('accept a file and regex when the file content matches the regex', function () {
      assert.doesNotThrow(helpers.assertFileContent.bind(helpers, 'testFile', /Roses are red/));
    });

    it('reject a file and regex when the file content does not match the regex', function () {
      assert.throws(helpers.assertFileContent.bind(helpers, 'testFile', /Roses are blue/));
    });

    it('accept an array of file/regex pairs when each file\'s content matches the corresponding regex', function () {
      var arg = [
        ['testFile', /Roses are red/],
        ['testFile2', /Violets are blue/]
      ];
      assert.doesNotThrow(helpers.assertFileContent.bind(helpers, arg));
    });

    it('reject an array of file/regex pairs when one file\'s content does not matches the corresponding regex', function () {
      var arg = [
        ['testFile', /Roses are red/],
        ['testFile2', /Violets are orange/]
      ];
      assert.throws(helpers.assertFileContent.bind(helpers, arg));
    });

  });

  describe('#assertNoFileContent', function () {

    it('accept a file and regex when the file content does not match the regex', function () {
      assert.doesNotThrow(helpers.assertNoFileContent.bind(helpers, 'testFile', /Roses are blue/));
    });

    it('reject a file and regex when the file content matches the regex', function () {
      assert.throws(helpers.assertNoFileContent.bind(helpers, 'testFile', /Roses are red/));
    });

    it('accept an array of file/regex pairs when each file\'s content does not match its corresponding regex', function () {
      var arg = [
        ['testFile', /Roses are green/],
        ['testFile2', /Violets are orange/]
      ];
      assert.doesNotThrow(helpers.assertNoFileContent.bind(helpers, arg));
    });

    it('reject an array of file/regex pairs when one file\'s content does matches its corresponding regex', function () {
      var arg = [
        ['testFile', /Roses are red/],
        ['testFile2', /Violets are orange/]
      ];
      assert.throws(helpers.assertNoFileContent.bind(helpers, arg));
    });

  });

});
