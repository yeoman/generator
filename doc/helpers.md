

<!-- Start lib/test/helpers.js -->

## setUpTestDirectory(dir)

Create a function that will clean up the test directory,
cd into it, and create a dummy gruntfile inside. Intended for use
as a callback for the mocha `before` hook.

### Params: 

* **String** *dir* - path to the test directory

## before(dir)

Create a function that will clean up the test directory,
cd into it, and create a dummy gruntfile inside. Intended for use
as a callback for the mocha `before` hook.

**Deprecated**

### Params: 

* **String** *dir* - path to the test directory

## decorate(context, method, replacement, options)

Wrap a method with custom functionality.

### Params: 

* **Object** *context* - context to find the original method

* **String** *method* - name of the method to wrap

* **Function** *replacement* - executes before the original method

* **Object** *options* - config settings

## stub(context, method, replacement)

Override a method with custom functionality.

### Params: 

* **Object** *context* - context to find the original method

* **String** *method* - name of the method to wrap

* **Function** *replacement* - executes before the original method

## restore()

Restore the original behavior of all decorated and stubbed methods

## gruntfile(options, done)

Generates a new Gruntfile.js in the current working directory based on
options hash passed in.

### Params: 

* **Object** *options* - Grunt configuration

* **Function** *done* - callback to call on completion

## testDirectory(dir, cb)

Clean-up the test directory and cd into it.
Call given callback after entering the test directory.

### Params: 

* **String** *dir* - path to the test directory

* **Function** *cb* - callback executed after setting working directory to dir

## mockPrompt(generator, answers)

Answer prompt questions for the passed-in generator

### Params: 

* **Generator** *generator* - a Yeoman generator

* **Object** *answers* - an object where keys are the

## createDummyGenerator()

Create a simple, dummy generator

## createGenerator(name, dependencies, args, options)

Create a generator, using the given dependencies and controller arguments
Dependecies can be path (autodiscovery) or an array [&lt;generator&gt;, &lt;name&gt;]

### Params: 

* **String** *name* - the name of the generator

* **Array** *dependencies* - paths to the generators dependencies

* **Array|String** *args* - arguments to the generator;

* **Object** *options* - configuration for the generator

<!-- End lib/test/helpers.js -->

