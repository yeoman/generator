
var path    = require('path');
var helpers = require('../..').test;

describe('Testacular:App generator test', function() {
  before(helpers.before(path.join(__dirname, './temp')));

  it('should run sucessfully', function(done) {
    helpers.runGenerator('testacular:app', done);
  });

  describe('create expected files', function() {
   
    it('should generate testacular.conf.js', function() {
      helpers.assertFile('testacular.conf.js');
    });
    
  });
});
