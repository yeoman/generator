/*global it, describe, before */

var util = require('util');
var assert = require('assert');
var generators = require('..');
var helpers = require('../').test;

describe('yeoman.generators.test', function () {
  'use strict';
  var Unicorn;

  before(function () {
    Unicorn = function () {
      generators.Base.apply(this, arguments);
    };

    util.inherits(Unicorn, generators.Base);

  });

  describe('helpers.createGenerator', function () {
    it('with default params', function () {
      assert.ok(helpers.createGenerator('unicorn:app', [
        [Unicorn, 'unicorn:app']
      ]));
    });

    it('with args params', function () {
      assert.ok(helpers.createGenerator('unicorn:app', [
        [Unicorn, 'unicorn:app']
      ], ['temp']));
    });

    it('with options param', function () {
      assert.ok(helpers.createGenerator('unicorn:app', [
        [Unicorn, 'unicorn:app']
      ], ['temp'], {ui: 'tdd'}));
    });
  });
});
