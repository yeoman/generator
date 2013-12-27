module.exports = function (grunt) {
  'use strict';

  grunt.initConfig({
    jshint: {
      options: grunt.file.readJSON('.jshintrc'),
      src: [ '**/*.js', '!test/**', '!node_modules/**' ],
      test: {
        options: {
          globals: {
            describe: true,
            it: true,
            beforeEach: true,
            afterEach: true,
            before: true,
            after: true
          }
        },
        src: 'test/**/*.js'
      }
    },

    jscs: {
      src: [ '**/*.js', '!test/**/*.js', '!node_modules/**/*.js' ]
    },

    mochacov: {
      options: {
        slow: 1500,
        timeout: 50000,
        reporter: 'spec',
        coverage: true,
        coveralls: {
          serviceName: 'travis-ci'
        }
      },
      src: ['test/*.js']
    }
  });

  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-jscs-checker');
  grunt.loadNpmTasks('grunt-mocha-cov');

  grunt.registerTask('default', [ 'jshint', 'jscs', 'mochacov' ]);
};
