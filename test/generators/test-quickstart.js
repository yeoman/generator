
var path    = require('path');
var helpers = require('../..').test;

describe('Quickstart generator test', function() {
  before(helpers.before(path.join(__dirname, './temp')));

  it('should run sucessfully', function(done) {
    helpers.runGenerator('quickstart', done);
  });

  describe('create expected files', function() {
   
    it('should generate .editorconfig', function() {
      helpers.assertFile('.editorconfig');
    });
    
    it('should generate .gitattributes', function() {
      helpers.assertFile('.gitattributes');
    });
    
    it('should generate .gitignore', function() {
      helpers.assertFile('.gitignore');
    });
    
    it('should generate .jshintrc', function() {
      helpers.assertFile('.jshintrc');
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
    
    it('should generate app/scripts/vendor/jquery.min.js', function() {
      helpers.assertFile('app/scripts/vendor/jquery.min.js');
    });
    
    it('should generate app/scripts/vendor/modernizr.min.js', function() {
      helpers.assertFile('app/scripts/vendor/modernizr.min.js');
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
    
    it('should generate test/lib/mocha/mocha.css', function() {
      helpers.assertFile('test/lib/mocha/mocha.css');
    });
    
    it('should generate test/lib/mocha/mocha.js', function() {
      helpers.assertFile('test/lib/mocha/mocha.js');
    });
    
    it('should generate test/runner/mocha.js', function() {
      helpers.assertFile('test/runner/mocha.js');
    });
    
    it('should generate test/spec/.gitkeep', function() {
      helpers.assertFile('test/spec/.gitkeep');
    });
    
  });
});
