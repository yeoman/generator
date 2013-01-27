/*global describe it */
var spawn = require('child_process').spawn;
var assert = require('assert');
var generators = require('..');


describe('Alias and namespaces', function () {
  it('env.namespace()', function () {
    var env = generators();
    assert.equal(env.namespace('backbone/all/index.js'), 'backbone:all');
    assert.equal(env.namespace('backbone/all/main.js'), 'backbone:all');
    assert.equal(env.namespace('backbone/all'), 'backbone:all');
    assert.equal(env.namespace('backbone/all.js'), 'backbone:all');
    assert.equal(env.namespace('backbone.js'), 'backbone');

    assert.equal(env.namespace('generator-backbone/all.js'), 'backbone:all');
    assert.equal(env.namespace('generator-mocha/backbone/model/index.js'), 'mocha:backbone:model');
    assert.equal(env.namespace('generator-mocha/backbone/model.js'), 'mocha:backbone:model');
    assert.equal(env.namespace('node_modules/generator-mocha/backbone/model.js'), 'mocha:backbone:model');

    assert.equal(env.namespace('../local/stuff'), 'local:stuff');
    assert.equal(env.namespace('./local/stuff'), 'local:stuff');
    assert.equal(env.namespace('././local/stuff'), 'local:stuff');
    assert.equal(env.namespace('../../local/stuff'), 'local:stuff');
  });
});
