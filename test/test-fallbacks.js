
var path       = require('path');
var assert     = require('assert');
var generators = require('..');
var helpers    = generators.test;



describe('generators config', function() {

  describe('when config("generators.test-framework") is set', function() {

    before(function() {
      generators.plugins = [path.join(__dirname, '..')];
    });

    it('I get the appropriate generator.options', function() {
      var generator = generators.create('generator', ['hey'], {}, {
        generator: {
          'test-framework': 'jojo'
        }
      });

      assert.equal(generator.options['test-framework'], 'jojo');
    });


    it('which is overriden by --test-framework', function() {
      var generator = generators.create('generator', ['hey'], {
        'test-framework': 'jasmine'
      });
      assert.equal(generator.options['test-framework'], 'jasmine');
    });
  });



});
