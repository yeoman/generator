
var path    = require('path');
var helpers = require('../..').test;

describe('Angular generator test', function() {
  before(helpers.before(path.join(__dirname, './temp')));

  it('runs sucessfully', function(done) {
    helpers.runGenerator('angular', done);
  });

  it('creates expected files', function() {

    helpers.assertFile('app/.htaccess');

    helpers.assertFile('app/404.html');

    helpers.assertFile('app/favicon.ico');

    helpers.assertFile('app/robots.txt');

    helpers.assertFile('app/scripts/vendor/angular.js');

    helpers.assertFile('app/scripts/vendor/angular.min.js');

    helpers.assertFile('app/styles/main.css');

    helpers.assertFile('app/views/main.html');

    helpers.assertFile('Gruntfile.js');

    helpers.assertFile('package.json');

    helpers.assertFile('test/lib/angular-mocks.js');

    helpers.assertFile('app/scripts/temp.js');

    helpers.assertFile('app/index.html');

    helpers.assertFile('app/scripts/controllers/main.js');

    helpers.assertFile('test/spec/controllers/main.js');

    helpers.assertFile('testacular.conf.js');

  });
});
