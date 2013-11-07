

<!-- Start lib/env/store.js -->

## Store

The Generator store
This is used to store generator (NPM modules) reference and instantiate them when
requested.

## add(namespace, generator)

Store a module under the namespace key

### Params: 

* **String** *namespace* - The key under which the generator can be retrieved

* **String|Function** *generator* - A generator module or a module path

## get(namespace)

Get the module registered under the given namespace

### Params: 

* **String** *namespace* 

### Return:

* **Module** 

## namespaces()

Returns the list of registered namespace.

### Return:

* **Array** Namespaces array

<!-- End lib/env/store.js -->

