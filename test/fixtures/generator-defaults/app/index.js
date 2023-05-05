'use strict';

// Example of a generator with options.
//
// It takes a list of arguments (usually CLI args) and a Hash of options
// (CLI options), the context of the function is a `new Generator.Base`
// object, which means that you can use the API as if you were extending
// `Base`.

import Base from '../../../../src/index.js';
import options from './options.js';
import prompts from './prompts.js';

export default class App extends Base {
  constructor(args, opts) {
    super(args, opts);

    this.option(options);

    this.registerConfigPrompts(prompts);
  }
}

App.namespace = 'options:generator';
