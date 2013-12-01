/*global it, describe, before, beforeEach */
var fs = require('fs');
var path = require('path');
var util = require('util');
var assert = require('assert');
var sinon = require('sinon');
var helpers = require('../lib/test/helpers');
var spawn = require('../lib/actions/spawn_command');
var shell = require('shelljs');

var Environment = require('../lib/env');

describe('Environment Resolver', function () {

  before(function () {
    this.projectRoot = path.join(__dirname, 'fixtures/lookup-project');
    process.chdir(this.projectRoot);
    shell.exec('npm install', { silent: true });
    shell.exec('npm install generator-jquery', { silent: true });
    shell.exec('npm install -g generator-angular', { silent: true });

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
  });

  describe('#lookup', function () {

    it('register local generators', function () {
      this.env.lookup();
      assert.ok(this.env.get('dummy:app'));
      assert.ok(this.env.get('dummy:yo'));
    });

    it('register non-dependency local generator', function () {
      this.env.lookup();
      assert.ok(this.env.get('jquery:app'));
    });

    it('register global generators', function () {
      this.env.lookup();
      assert.ok(this.env.get('angular:app'));
      assert.ok(this.env.get('angular:controller'));
    });

    it('register symlinked generators', function() {
      this.env.lookup();
      assert.ok(this.env.get('extend:support'));
    });

  });

});
