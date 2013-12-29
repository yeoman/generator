/*global it, xit, describe, before, after, beforeEach, afterEach */
'use strict';
var fs = require('fs');
var path = require('path');
var util = require('util');
var assert = require('assert');
var sinon = require('sinon');
var helpers = require('../lib/test/helpers');
var spawn = require('../lib/actions/spawn_command');
var shell = require('shelljs');

var Environment = require('../lib/env');

var globalLookupTest = process.env.NODE_PATH ? it : xit;

describe('Environment Resolver', function () {

  before(function () {
    this.projectRoot = path.join(__dirname, 'fixtures/lookup-project');
    process.chdir(this.projectRoot);
    shell.exec('npm install', { silent: true });
    shell.exec('npm install generator-jquery', { silent: true });
    shell.exec('npm install -g generator-angular generator-dummy', { silent: true });

    fs.symlinkSync(
      path.resolve('../custom-generator-extend'),
      path.resolve('./node_modules/generator-extend'),
      'dir'
    );
  });

  after(function () {
    fs.unlinkSync(path.join(this.projectRoot, './node_modules/generator-extend'));
  });

  beforeEach(function () {
    this.env = new Environment();
    assert.equal(this.env.namespaces().length, 0, 'ensure env is empty');
    this.env.lookup();
  });

  describe('#lookup', function () {

    it('register local generators', function () {
      assert.ok(this.env.get('dummy:app'));
      assert.ok(this.env.get('dummy:yo'));
    });

    it('register non-dependency local generator', function () {
      assert.ok(this.env.get('jquery:app'));
    });

    if (!process.env.NODE_PATH) {
      console.log('Skipping tests for global generators. Please setup `NODE_PATH` ' +
        'environment variable to run it.');
    }

    it('local generators prioritized over global', function () {
      assert.ok(this.env.get('dummy:app').resolved.indexOf('lookup-project') !== -1);
    });

    globalLookupTest('register global generators', function () {
      assert.ok(this.env.get('angular:app'));
      assert.ok(this.env.get('angular:controller'));
    });

    it('register symlinked generators', function () {
      assert.ok(this.env.get('extend:support:scaffold'));
    });

    describe('when there\'s ancestor node_modules/ folder', function () {

      before(function () {
        this.projectSubRoot = path.join(this.projectRoot, 'subdir');
        process.chdir(this.projectSubRoot);
        shell.exec('npm install', { silent: true });

      });

      beforeEach(function () {
        this.env = new Environment();
        assert.equal(this.env.namespaces().length, 0, 'ensure env is empty');
        this.env.lookup();
      });

      it('register generators in ancestor node_modules directory', function () {
        assert.ok(this.env.get('jquery:app'));
      });

      it('local generators are prioritized over ancestor', function () {
        assert.ok(this.env.get('dummy:app').resolved.indexOf('subdir') !== -1);
      });

    });

  });
});
