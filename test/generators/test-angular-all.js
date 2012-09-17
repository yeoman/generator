
var path    = require('path');
var helpers = require('../..').test;

describe('Angular:All generator test', function() {
  before(helpers.before(path.join(__dirname, './temp')));

  it('should run sucessfully', function(done) {
    helpers.runGenerator('angular:all', done);
  });

  it('create expected files', function() {
     
    helpers.assertFile('app/.htaccess');
    helpers.assertFile('app/404.html');
    helpers.assertFile('app/favicon.ico');
    helpers.assertFile('app/robots.txt');
    helpers.assertFile('app/scripts/vendor/angular.js');
  });
});
