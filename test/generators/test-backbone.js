
var path    = require('path');
var helpers = require('../..').test;

describe('Backbone generator test', function() {
  before(helpers.before(path.join(__dirname, './temp')));

  it('should run sucessfully', function(done) {
    helpers.runGenerator('backbone', done);
  });

  describe('create expected files', function() {
   
    it('should generate app/scripts/main.js', function() {
      helpers.assertFile('app/scripts/main.js');
    });
    
    it('should generate .gitattributes', function() {
      helpers.assertFile('.gitattributes');
    });
    
    it('should generate .gitignore', function() {
      helpers.assertFile('.gitignore');
    });
    
    it('should generate app/.htaccess', function() {
      helpers.assertFile('app/.htaccess');
    });
    
    it('should generate app/404.html', function() {
      helpers.assertFile('app/404.html');
    });
    
    it('should generate app/favicon.ico', function() {
      helpers.assertFile('app/favicon.ico');
    });
    
    it('should generate app/index.html', function() {
      helpers.assertFile('app/index.html');
    });
    
    it('should generate app/robots.txt', function() {
      helpers.assertFile('app/robots.txt');
    });
    
    it('should generate app/scripts/vendor/backbone-min.js', function() {
      helpers.assertFile('app/scripts/vendor/backbone-min.js');
    });
    
    it('should generate app/scripts/vendor/jquery.min.js', function() {
      helpers.assertFile('app/scripts/vendor/jquery.min.js');
    });
    
    it('should generate app/scripts/vendor/lodash.min.js', function() {
      helpers.assertFile('app/scripts/vendor/lodash.min.js');
    });
    
    it('should generate app/styles/main.css', function() {
      helpers.assertFile('app/styles/main.css');
    });
    
    it('should generate Gruntfile.js', function() {
      helpers.assertFile('Gruntfile.js');
    });
    
    it('should generate package.json', function() {
      helpers.assertFile('package.json');
    });
    
    it('should generate test/index.html', function() {
      helpers.assertFile('test/index.html');
    });
    
    it('should generate test/lib/chai.js', function() {
      helpers.assertFile('test/lib/chai.js');
    });
    
    it('should generate test/lib/expect.js', function() {
      helpers.assertFile('test/lib/expect.js');
    });
    
    it('should generate test/lib/mocha-1.2.2/mocha.css', function() {
      helpers.assertFile('test/lib/mocha-1.2.2/mocha.css');
    });
    
    it('should generate test/lib/mocha-1.2.2/mocha.js', function() {
      helpers.assertFile('test/lib/mocha-1.2.2/mocha.js');
    });
    
    it('should generate test/runner/mocha.js', function() {
      helpers.assertFile('test/runner/mocha.js');
    });
    
    it('should generate app/scripts/routes/application-router.js', function() {
      helpers.assertFile('app/scripts/routes/application-router.js');
    });
    
    it('should generate app/scripts/views/application-view.js', function() {
      helpers.assertFile('app/scripts/views/application-view.js');
    });
    
    it('should generate app/scripts/templates/application.ejs', function() {
      helpers.assertFile('app/scripts/templates/application.ejs');
    });
    
    it('should generate app/scripts/models/application-model.js', function() {
      helpers.assertFile('app/scripts/models/application-model.js');
    });
    
    it('should generate app/scripts/collections/application-collection.js', function() {
      helpers.assertFile('app/scripts/collections/application-collection.js');
    });
    
  });
});
