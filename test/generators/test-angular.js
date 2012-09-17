
var path    = require('path');
var helpers = require('../..').test;

describe('Angular generator test', function() {
  before(helpers.before(path.join(__dirname, './temp')));

  it('should run sucessfully', function(done) {
    helpers.runGenerator('angular', done);
  });

  describe('create expected files', function() {
   
    it('should generate app/.htaccess', function() {
      helpers.assertFile('app/.htaccess');
    });
    
    it('should generate app/404.html', function() {
      helpers.assertFile('app/404.html');
    });
    
    it('should generate app/favicon.ico', function() {
      helpers.assertFile('app/favicon.ico');
    });
    
    it('should generate app/robots.txt', function() {
      helpers.assertFile('app/robots.txt');
    });
    
    it('should generate app/scripts/vendor/angular.js', function() {
      helpers.assertFile('app/scripts/vendor/angular.js');
    });
    
    it('should generate app/scripts/vendor/angular.min.js', function() {
      helpers.assertFile('app/scripts/vendor/angular.min.js');
    });
    
    it('should generate app/styles/main.css', function() {
      helpers.assertFile('app/styles/main.css');
    });
    
    it('should generate app/views/main.html', function() {
      helpers.assertFile('app/views/main.html');
    });
    
    it('should generate Gruntfile.js', function() {
      helpers.assertFile('Gruntfile.js');
    });
    
    it('should generate package.json', function() {
      helpers.assertFile('package.json');
    });
    
    it('should generate test/lib/angular-mocks.js', function() {
      helpers.assertFile('test/lib/angular-mocks.js');
    });
    
    it('should generate app/scripts/temp.js', function() {
      helpers.assertFile('app/scripts/temp.js');
    });
    
    it('should generate app/index.html', function() {
      helpers.assertFile('app/index.html');
    });
    
    it('should generate app/scripts/controllers/main.js', function() {
      helpers.assertFile('app/scripts/controllers/main.js');
    });
    
    it('should generate test/spec/controllers/main.js', function() {
      helpers.assertFile('test/spec/controllers/main.js');
    });
    
    it('should generate testacular.conf.js', function() {
      helpers.assertFile('testacular.conf.js');
    });
    
  });
});
