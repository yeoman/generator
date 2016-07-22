'use strict';

// Example of a generator with options.
//
// It takes a list of arguments (usually CLI args) and a Hash of options
// (CLI options), the context of the function is a `new Generator.Base`
// object, which means that you can use the API as if you were extending
// `Base`.

var yeoman = require('../../../');

module.exports = yeoman.Base.extend({
  constructor: function () {
    yeoman.Base.apply(this, arguments);

    // this.log('as passed in: ', this.options.testOption);
    this.option('testOption', {
      type: Boolean,
      desc: 'Testing falsey values for option',
      defaults: true
    });
  },

  testOption: function () {
    // this.log('as rendered: ', this.options.testOption);
  }
});

module.exports.namespace = 'options:generator';
