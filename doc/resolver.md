

<!-- Start lib/env/resolver.js -->

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

<!-- End lib/env/resolver.js -->

