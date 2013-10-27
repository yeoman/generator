/*global it, describe, before, beforeEach */

var util = require('util');
var assert = require('assert');
var yeoman = require('..');
var helpers = yeoman.test;

describe('yeoman.test', function () {
  'use strict';

  beforeEach(function () {
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
      ], ['temp'], {ui: 'tdd'});
      assert.equal(this.options.ui, 'tdd');
    });
  });
});
