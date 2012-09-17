
var path    = require('path');
var helpers = require('../..').test;

describe('Ember-Starter generator test', function() {
  before(helpers.before(path.join(__dirname, './temp')));

  it('should run sucessfully', function(done) {
    helpers.runGenerator('ember-starter', done);
  });

  describe('create expected files', function() {
   
    it('should generate app/scripts/app.js', function() {
      helpers.assertFile('app/scripts/app.js');
    });
    
    it('should generate app/scripts/libs/ember-1.0.pre.js', function() {
      helpers.assertFile('app/scripts/libs/ember-1.0.pre.js');
    });
    
    it('should generate app/scripts/libs/handlebars-1.0.0.beta.6.js', function() {
      helpers.assertFile('app/scripts/libs/handlebars-1.0.0.beta.6.js');
    });
    
    it('should generate app/scripts/libs/jquery-1.7.2.min.js', function() {
      helpers.assertFile('app/scripts/libs/jquery-1.7.2.min.js');
    });
    
    it('should generate app/index.html', function() {
      helpers.assertFile('app/index.html');
    });
    
    it('should generate app/styles/style.css', function() {
      helpers.assertFile('app/styles/style.css');
    });
    
    it('should generate Gruntfile.js', function() {
      helpers.assertFile('Gruntfile.js');
    });
    
  });
});
