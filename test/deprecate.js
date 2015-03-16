/*global describe, before, beforeEach, after, afterEach, it */
'use strict';

var chalk = require('chalk');
var sinon = require('sinon');
var deprecate = require('../lib/util/deprecate');

describe('deprecate()', function () {
  beforeEach(function () {
    sinon.stub(console, 'log');
  });

  afterEach(function () {
    console.log.restore();
  });

  it('log a message', function () {
    var func = sinon.spy();
    var wrapped = deprecate('foo', func);
    sinon.assert.notCalled(console.log);
    wrapped('bar', 2);
    sinon.assert.calledWith(console.log, chalk.yellow('(!) ') + 'foo');
    sinon.assert.calledWith(func, 'bar', 2);
  });
});
