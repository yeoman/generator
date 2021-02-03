'use strict';

// Example of a generator with options.
//
// It takes a list of arguments (usually CLI args) and a Hash of options
// (CLI options), the context of the function is a `new Generator.Base`
// object, which means that you can use the API as if you were extending
// `Base`.

var Base = require('../../../../');

module.exports = class extends Base {
  constructor(args, opts) {
    super(args, opts);

    this.option(require('./options'));

    this.registerConfigPrompts(require('./prompts'));
  }
};

module.exports.namespace = 'options:generator';
