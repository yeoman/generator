/*global describe, it */
var assert = require('assert');
var shelljs = require('shelljs');
var shellModule = require('../lib/actions/shell');
var _ = require('lodash');

describe('Generator shell methods API', function () {

  it('should extend shelljs module', function () {
    _.each(shelljs, function (method, name) {
      assert.equal(method, shellModule.shell[name]);
    });
  });

});
