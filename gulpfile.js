'use strict';
var gulp = require('gulp');
var mocha = require('gulp-mocha');
var jshint = require('gulp-jshint');
var jscs = require('gulp-jscs');
var istanbul = require('gulp-istanbul');
var coveralls = require('coveralls');
var fs = require('fs');
var path = require('path');

gulp.task('test', function (cb) {
  var coverage = gulp.src(['lib/**/*.js', 'main.js'])
    .pipe(istanbul())
    .on('end', function () {
      gulp.src(['test/*.js'])
        .pipe(mocha({ reporter: 'spec', timeout: 100000 }))
        .pipe(istanbul.writeReports())
        .on('end', cb);
    });
});

gulp.task('default', function () {
  gulp.src([
    'test/*.js',
    'lib/**/*.js',
    'benchmark/**/*.js',
    'main.js',
    'doc.js',
    'gulpfile.js'
  ]).pipe(jshint('.jshintrc'))
    .pipe(jshint.reporter('jshint-stylish'))
    .pipe(jscs());

  gulp.run('test', function () {
    var fileContents = fs.readFileSync(path.join(__dirname, 'coverage/lcov.info'), 'utf8');
    coveralls.getOptions(function (err, opt) {
      if (err) throw err;
      coveralls.convertLcovToCoveralls(fileContents, opt, function (err, data) {
        if (err) throw err;
        coveralls.sendToCoveralls(data, function (err, response, body) {
          var status = JSON.parse(body);
          if (!body.error) {
            console.log('Coveralls: Success');
          } else {
            console.log('Coveralls: Error ' + status.message);
          }
        });
      });
    });
  });
});
