
var path   = require('path');
var mkdirp = require('mkdirp');
var rimraf = require('rimraf');

// Mocha helpers

var helpers = module.exports;

// cleaup the test dir, and cd into it
helpers.before = function before(done) {
  process.chdir(path.join(__dirname, '..'));
  rimraf('.test', function(err) {
    if(err) return done(err);
    mkdirp('.test', function() {
      if(err) return done(err);
      process.chdir('.test');
      done();
    });
  });
};
