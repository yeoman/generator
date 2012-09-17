
var path    = require('path');
var helpers = require('../..').test;

describe('Bbb generator test', function() {
  before(helpers.before(path.join(__dirname, './temp')));

  it('should run sucessfully', function(done) {
    helpers.runGenerator('bbb', done);
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
    
    it('should generate app/scripts/app.js', function() {
      helpers.assertFile('app/scripts/app.js');
    });
    
    it('should generate app/scripts/config.js', function() {
      helpers.assertFile('app/scripts/config.js');
    });
    
    it('should generate app/scripts/libs/almond.js', function() {
      helpers.assertFile('app/scripts/libs/almond.js');
    });
    
    it('should generate app/scripts/libs/backbone.js', function() {
      helpers.assertFile('app/scripts/libs/backbone.js');
    });
    
    it('should generate app/scripts/libs/jquery.js', function() {
      helpers.assertFile('app/scripts/libs/jquery.js');
    });
    
    it('should generate app/scripts/libs/lodash.js', function() {
      helpers.assertFile('app/scripts/libs/lodash.js');
    });
    
    it('should generate app/scripts/libs/require.js', function() {
      helpers.assertFile('app/scripts/libs/require.js');
    });
    
    it('should generate app/scripts/main.js', function() {
      helpers.assertFile('app/scripts/main.js');
    });
    
    it('should generate app/scripts/plugins/backbone.layoutmanager.js', function() {
      helpers.assertFile('app/scripts/plugins/backbone.layoutmanager.js');
    });
    
    it('should generate app/scripts/router.js', function() {
      helpers.assertFile('app/scripts/router.js');
    });
    
    it('should generate app/styles/h5bp.css', function() {
      helpers.assertFile('app/styles/h5bp.css');
    });
    
    it('should generate app/styles/index.css', function() {
      helpers.assertFile('app/styles/index.css');
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
    
    it('should generate test/spec/example.js', function() {
      helpers.assertFile('test/spec/example.js');
    });
    
  });
});
