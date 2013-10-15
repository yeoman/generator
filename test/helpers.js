/*global it, describe, before, beforeEach */

var util = require('util');
var assert = require('assert');
var generators = require('..');
var helpers = require('../').test;

describe('yeoman.generators.test', function () {
  'use strict';
  var Unicorn;

  beforeEach(function () {
    var self = this;
    Unicorn = function (args, options) {
      self.args = args;
      self.options = options;
      generators.Base.apply(this, arguments);
    };

    util.inherits(Unicorn, generators.Base);

    });

  describe('helpers.createGenerator', function () {

    it('with args params', function () {
      helpers.createGenerator('unicorn:app', [
        [Unicorn, 'unicorn:app']
      ], ['temp']);
      // assert.ok();
      assert.deepEqual(this.args, ['temp']);
    });

    it('with options param', function () {
      helpers.createGenerator('unicorn:app', [
        [Unicorn, 'unicorn:app']
      ], ['temp'], {ui: 'tdd'});
      assert.equal(this.options.ui, 'tdd');
    });
  });
});
