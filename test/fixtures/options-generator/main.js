'use strict';

// Example of a generator with options.
//
// It takes a list of arguments (usually CLI args) and a Hash of options
// (CLI options), the context of the function is a `new Generator.Base`
// object, which means that you can use the API as if you were extending
// `Base`.

import Base from '../../../src/index.js';

export default class Generator extends Base {
  constructor(args, opts) {
    super(args, opts);

    this.option('testOption', {
      type: Boolean,
      desc: 'Testing falsey values for option',
      defaults: true,
    });
  }

  testOption() {
    return 'foo';
  }
}

Generator.namespace = 'options:generator';
