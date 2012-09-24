
var path   = require('path');
var util   = require('util');
var yeoman = require('../../../../');
var grunt  = require('grunt');
var _      = grunt.util._;

module.exports = TestGenerator;

// TestGenerator stubs out a very basic test suite during the generation
// process of a new generator.
//
// XXX:
//  - consider adding _.string API to generators prototype

function TestGenerator() {
  yeoman.generators.NamedBase.apply(this, arguments);

  // dasherize the thing
  this.filename = _.dasherize(this.name).replace(/:/, '-');

  this.argument('files', {
    type: Array,
    banner: 'app/file/to/test.js test/something.js ...'
  });

  this.option('internal', {
    desc: 'Enable this flag when generating from yeoman-generators repo'
  });

  this.option('prefix', {
    desc: 'Specify an alternate base directory',
    defaults: 'test/generators/'
  });

  this.pkg = this.options.internal ? '../..' : 'yeoman-generators';
}

util.inherits(TestGenerator, yeoman.generators.NamedBase);

TestGenerator.prototype.createTestSuite = function() {
  this.template('test.js', path.join(this.options.prefix, 'test-' + this.filename + '.js'));
};
