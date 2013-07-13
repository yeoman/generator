/*global describe, it */
var assert = require('assert');
var shelljs = require('shelljs');
var shellModule = require('../lib/actions/shell');
var _ = require('lodash');

describe('Generator shell methods API', function () {

  it('should be exposed on the Base generator', function () {
    assert.equal(shellModule, require('../lib/base').prototype.shell);
  });

  it('should extend shelljs module', function () {
    _.each(shelljs, function (method, name) {
      assert.equal(method, shellModule[name]);
    });
  });

});
