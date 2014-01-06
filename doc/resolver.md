

<!-- Start lib/env/resolver.js -->

## lookup()

Search for generators and their sub generators.

A generator is a `:lookup/:name/index.js` file placed inside an NPM module.

Defaults lookups are:
  - ./
  - generators/
  - lib/generators/

So this index file `node_modules/generator-dummy/lib/generators/yo/index.js` would be
registered as `dummy:yo` generator.

## _getNpmGenerators()

index.js');
    });
  });

  patterns.forEach(function (pattern) {
    glob.sync(pattern).forEach(function (filename) {
      this._tryRegistering(filename);
    }, this);
  }, this);
};

/**
Search NPM for every available generators.
Generators are NPM modules who's name start with `generator-` and who're placed in the
top level `node_module` path. They can be installed globally or locally.

### Return:

* **Array** List of the generators path

## _tryRegistering(generatorReference)

Try registering a Generator to this environment.

### Params: 

* **String** *generatorReference* A generator reference, usually a file path.

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

<!-- End lib/env/resolver.js -->

