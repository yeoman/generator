'use strict';

// Example of a simple generator.
//
// A raw function that is executed when this generator is resolved.
//
// It takes a list of arguments (usually CLI args) and a Hash of options
// (CLI options), the context of the function is a `new Generator.Base`
// object, which means that you can use the API as if you were extending
// `Base`.
//
// It works with simple generator, if you need to do a bit more complex
// stuff, extends from Generator.Base and defines your generator steps
// in several methods.
import Base from '../../../src/index.js';

class Generator extends Base {
  notEmpty() {}
}

Generator.description =
  'Ana add a custom description by adding a `description` property to your function.';
Generator.usage = 'Usage can be used to customize the help output';

// Namespace is resolved depending on the location of this generator,
// unless you specifically define it.
Generator.namespace = 'mocha:generator';

export default Generator;
