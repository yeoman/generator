

<!-- Start lib/env.js -->

## Environment

`Environment` object is responsible of handling the lifecyle and bootstrap
of generators in a specific environment (your app).

It provides a high-level API to create and run generators, as well as further
tuning where and how a generator is resolved.

An environment is created using a list of `arguments` and a Hash of
`options`. Usually, this is the list of arguments you get back from your CLI
options parser.

### Params: 

* **String|Array** *args* 

* **Object** *opts* 

## error(err)

Error handler taking `err` instance of Error.

The `error` event is emitted with the error object, if no `error` listener
is registered, then we throw the error.

### Params: 

* **Object** *err* 

## engine(engine)

Configures the `engine` to use for this environment.

### Params: 

* **String** *engine* 

## appendPath(filepath)

Appends a `filepath` to the list of loadpaths.

### Params: 

* **String** *filepath* 

## appendLookup(filepath)

Appends a new `filepath` to the list of lookups path. This should be a
relative filepath, like `support/scaffold`. Environments are created with
`lib/generators` as a lookup path by default.

### Params: 

* **String** *filepath* 

## help(name)

Outputs the general help and usage. Optionally, if generators have been
registered, the list of available generators is also displayed.

### Params: 

* **String** *name* 

## register(name, namespace)

Registers a specific `generator` to this environment. A generator can be a
simple function or an object extending from `Generators.Base`. The later
method is favored as it allows you to specify options/arguments for
self-documented generator with `USAGE:` and so on.

In case of a simple function, the generator does show up in the `--help`
output, but without any kind of arguments/options. You must document them
manually with your `USAGE` file.

In any case, the API available in generators is the same. Raw functions are
executed within the context of a `new Generators.Base`.

`register()` can also take Strings, in which case it is considered a
filepath to `require()`.

### Params: 

* **String|Function** *name* 

* **String** *namespace* 

## namespaces()

Returns the list of registered namespace.

## get(namespace)

Get a single generator from the registered list of generators. The lookup is
based on generator's namespace, &quot;walking up&quot; the namespaces until a matching
is found. Eg. if an `angular:common` namespace is registered, and we try to
get `angular:common:all` then we get `angular:common` as a fallback (unless
an `angular:common:all` generator is registered).

### Params: 

* **String** *namespace* 

## create(namespace, options)

Create is the Generator factory. It takes a namespace to lookup and optional
hash of options, that lets you define `arguments` and `options` to
instantiate the generator with.

An error is raised on invalid namespace.

### Params: 

* **String** *namespace* 

* **Object** *options* 

## run(args, options, done)

Tries to locate and run a specific generator. The lookup is done depending
on the provided arguments, options and the list of registered generators.

When the environment was unable to resolve a generator, an error is raised.

### Params: 

* **String|Array** *args* 

* **Object** *options* 

* **Function** *done* 

## lookup(namespaces, lookupdir)

Receives namespaces in an array and tries to find matching generators in the
load paths.

We lookup namespaces in several places, namely `this.lookups`
list of relatives directory path. A `generator-` prefix is added if a
namespace wasn't `require()`-able directly, matching `generator-*` kind of
pattern in npm installed package.

You can also lookup using glob-like star pattern, eg. `angular:*` gets
expanded to `angular\*\index.js`.

The default alias `generator-$1` lookup is added automatically.

### Examples:

    // search for all angular generators in the load path
    env.lookup('angular:*');

    // register any valid set of generator in the load paths
    env.lookup('*:*');

### Params: 

* **String|Array** *namespaces* 

* **String** *lookupdir* 

## alias(match, value)

Get or create an alias.

Alias allows the `get()` and `lookup()` methods to search in alternate
filepath for a given namespaces. It's used for example to map `generator-*`
npm package to their namespace equivalent (without the generator- prefix),
or to default a single namespace like `angular` to `angular:app` or
`angular:all`.

Given a single argument, this method acts as a getter. When both name and
value are provided, acts as a setter and registers that new alias.

If multiple alias are defined, then the replacement is recursive, replacing
each alias in reverse order.

An alias can be a single String or a Regular Expression. The finding is done
based on .match().

### Examples:

    env.alias(/^([a-zA-Z0-9:\*]+)$/, 'generator-$1');
    env.alias(/^([^:]+)$/, '$1:app');
    env.alias(/^([^:]+)$/, '$1:all');
    env.alias('foo');
    // =&gt; generator-foo:all

### Params: 

* **String|RegExp** *match* 

* **String** *value* 

## namespace(filepath)

Given a String `filepath`, tries to figure out the relative namespace.

### Examples:

    this.namespace('backbone/all/index.js');
    // =&gt; backbone:all

    this.namespace('generator-backbone/model');
    // =&gt; backbone:model

    this.namespace('backbone.js');
    // =&gt; backbone

    this.namespace('generator-mocha/backbone/model/index.js');
    // =&gt; mocha:backbone:model

### Params: 

* **String** *filepath* 

## prefix(prefix)

Adds the namespace prefix to this environment, such as `generator-*`,
used when resolving namespace, replacing the leading `*` in the
namespace by the configured prefix(es).

### Examples:

    this.prefix('generator-');

### Params: 

* **String** *prefix* 

## suffix(suffix)

Get or set the namespace suffix to this environment, such as `*\index.js`,
used when resolving namespace, replacing the last `*` in the
namespace by the configured suffix.

### Examples:

    this.suffix('*\index.js');
    this.suffix();
    // =&gt; '*\index.js'

### Params: 

* **String** *suffix* 

## plugins(filename, basedir)

Walk up the filesystem looking for a `node_modules` folder, and add it if
found to the load path.

### Params: 

* **String** *filename* 

* **String** *basedir* 

## remote(name, done)

Install an npm package locally, expanding github like user/repo pattern to
the remote tarball for master.

It is taking care of potential remote packages (or local on the current file
system) by delegating the groundwork of getting the package to npm.

### Params: 

* **String** *name* 

* **Function** *done* 

<!-- End lib/env.js -->

