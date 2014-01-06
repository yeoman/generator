

<!-- Start lib/env/index.js -->

## Environment

`Environment` object is responsible of handling the lifecyle and bootstrap
of generators in a specific environment (your app).

It provides a high-level API to create and run generators, as well as further
tuning where and how a generator is resolved.

An environment is created using a list of `arguments` and a Hash of
`options`. Usually, this is the list of arguments you get back from your CLI
options parser.

An optional adapter can be passed to provide interaction in non-CLI environment
(e.g. IDE plugins), otherwise a `TerminalAdapter` is instantiated by default

### Params: 

* **String|Array** *args* 

* **Object** *opts* 

* **Adapter** *adaper* 

## error(err)

Error handler taking `err` instance of Error.

The `error` event is emitted with the error object, if no `error` listener
is registered, then we throw the error.

### Params: 

* **Object** *err* 

### Return:

* **Error** err

## appendPath(filepath)

Appends a `filepath` to the list of loadpaths.

### Params: 

* **String** *filepath* 

## appendDefaultPaths()

Appends the defaults node modules paths to the Environment load paths.

## help(name)

Outputs the general help and usage. Optionally, if generators have been
registered, the list of available generators is also displayed.

### Params: 

* **String** *name* 

## register(name, namespace)

Registers a specific `generator` to this environment. This generator is stored under
provided namespace, or a default namespace format if none if available.

### Params: 

* **String** *name* - Filepath to the a generator or a NPM module name

* **String** *namespace* - Namespace under which register the generator (optionnal)

### Return:

* **this** 

## registerStub(Generator, namespace)

Register a stubbed generator to this environment. This method allow to register raw
functions under the provided namespace. `registerStub` will enforce the function passed
to extend the Base generator automatically.

### Params: 

* **Function** *Generator* - A Generator constructor or a simple function

* **String** *namespace* - Namespace under which register the generator

### Return:

* **this** 

## namespaces()

Returns the list of registered namespace.

### Return:

* **Array** 

## getGeneratorsMeta()

Returns stored generators meta

### Return:

* **Object** 

## get(namespace)

Get a single generator from the registered list of generators. The lookup is
based on generator's namespace, &quot;walking up&quot; the namespaces until a matching
is found. Eg. if an `angular:common` namespace is registered, and we try to
get `angular:common:all` then we get `angular:common` as a fallback (unless
an `angular:common:all` generator is registered).

### Params: 

* **String** *namespace* 

### Return:

* **Generator** - the generator registered under the namespace

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

## resolveModulePath(moduleId)

Resolve a module path

### Params: 

* **String** *moduleId* - Filepath or module name

### Return:

* **String** - The resolved path leading to the module

## enforceUpdate(env)

Make sure the Environment present expected methods if an old version is
passed to a Generator.

### Params: 

* **Environment** *env* 

### Return:

* **Environment** The updated env

<!-- End lib/env/index.js -->

