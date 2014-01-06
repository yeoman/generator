

<!-- Start lib/base.js -->

## Base

The `Base` object provides the common API shared by all generators,
defining options, arguments, hooks, file, prompt, log, API etc.

Every generator should extend from this object.

### Params: 

* **String|Array** *args* 

* **Object** *options* 

## option(name, config)

Adds an option to the set of generator expected options, only used to
generate generator usage. By default, generators get all the cli option
parsed by nopt as a `this.options` Hash object.

### Options:

  - `desc` Description for the option
  - `type` Either Boolean, String or Number
  - `default` Default value
  - `banner` String to show on usage notes
  - `hide` Boolean whether to hide from help

### Params: 

* **String** *name* 

* **Object** *config* 

## argument(name, config)

Adds an argument to the class and creates an attribute getter for it.

Arguments are different from options in several aspects. The first one
is how they are parsed from the command line, arguments are retrieved
from position.

Besides, arguments are used inside your code as a property (`this.argument`),
while options are all kept in a hash (`this.options`).

### Options:

  - `desc` Description for the argument
  - `required` Boolean whether it is required
  - `optional` Boolean whether it is optional
  - `type` String, Number, Array, or Object
  - `defaults` Default value for this argument
  - `banner` String to show on usage notes

### Params: 

* **String** *name* 

* **Object** *config* 

## run(args, cb)

Runs the generator, executing top-level methods in the order they
were defined.

Special named method like `constructor` and `initialize` are skipped
(CoffeeScript and Backbone like inheritence), or any method prefixed by
a `_`.

You can also supply the arguments for the method to be invoked, if
none is given, the same values used to initialize the invoker are
used to initialize the invoked.

### Params: 

* **String|Array** *args* 

* **Function** *cb* 

## runHooks(cb)

Goes through all registered hooks, invoking them in series.

### Params: 

* **Function** *cb* 

## hookFor(name, config)

Registers a hook to invoke when this generator runs.

A generator with a namespace based on the value supplied by the user
to the given option named `name`. An option is created when this method is
invoked and you can set a hash to customize it.

Must be called prior to the generator run (shouldn't be called within
a generator &quot;step&quot; - top-level methods).

### Options:

  - `as` The context value to use when runing the hooked generator
  - `args` The array of positional arguments to init and run the generator with
  - `options` An object containing a nested `options` property with the hash of options to use to init and run the generator with

### Examples:

    // $ yo webapp --test-framework jasmine
    this.hookFor('test-framework');
    // =&gt; registers the `jasmine` hook

    // $ yo mygen:subgen --myargument
    this.hookFor('mygen', {
      as: 'subgen',
      options: {
        options: {
          'myargument': true
        }
      }
    }

### Params: 

* **String** *name* 

* **Object** *config* 

## defaultFor(name)

Return the default value for the option name.

Also performs a lookup in CLI options and the `this.fallbacks`
property.

### Params: 

* **String** *name* 

## bannerFor(config)

Generate the default banner for help output, adjusting output to
argument type.

Options:

  - `name` Uppercased value to display (only relevant with `String` type)
  - `type` String, Number, Object or Array

### Params: 

* **Object** *config* 

## help()

Tries to get the description from a USAGE file one folder above the
source root otherwise uses a default description.

## usage()

Output usage information for this given generator, depending on its arguments,
options or hooks.

## desc(description)

Simple setter for custom `description` to append on help output.

### Params: 

* **String** *description* 

## optionsHelp()

Returns the list of options in formatted table.

## rootGeneratorName()

Determine the root generator name (the one who's extending Base).

## _setStorage()

Setup a storage instance.

## destinationRoot(rootPath)

Change the generator destination root directory.
This path is used to find storage, when using `this.dest` and `this.src` and for
multiple file actions (like `this.write` and `this.copy`)

### Params: 

* **String** *rootPath* new destination root path

### Return:

* **String** destination root path

## sourceRoot(rootPath)

Change the generator source root directory.
This path is used by `this.dest` and `this.src` and multiples file actions like
(`this.read` and `this.copy`)

### Params: 

* **String** *rootPath* new source root path

### Return:

* **String** source root path

## getCollisionFilter()

Return a file Env validation filter checking for collision

## extend

Extend this Class to create a new one inherithing this one.
Also add a helper __super__ object poiting to the parent prototypes methods

### Params: 

* **Object** *protoProps* Prototype properties (available on the instances)

* **Object** *staticProps* Static properties (available on the contructor)

### Return:

* **Object** New sub class

<!-- End lib/base.js -->

