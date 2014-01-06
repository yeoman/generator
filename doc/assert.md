

<!-- Start lib/test/assert.js -->

## file(file, pairs, file, reg)

Assert that a file exists

**Deprecated**

### Params: 

* **String** *file* - path to a file

* **Array** *pairs* - an array of paths to files

* **String** *file* - path to a file

* **Regex** *reg* - regex that will be used to search the file

## noFile(file, pairs)

Assert that a file doesn't exist

### Params: 

* **String** *file* - path to a file

* **Array** *pairs* - an array of paths to files

## files(pairs)

Assert that each of an array of files exists. If an item is an array with
the first element a filepath and the second element a regex, check to see
that the file content matches the regex

**Deprecated**

### Params: 

* **Array** *pairs* - an array of paths to files or file/regex subarrays

## fileContent(file, reg, pairs)

Assert that a file's content matches a regex

### Params: 

* **String** *file* - path to a file

* **Regex** *reg* - regex that will be used to search the file

* **Array** *pairs* - an array of arrays, where each subarray is a [String, RegExp] pair

## noFileContent(file, reg, pairs)

Assert that a file's content does not match a regex

### Params: 

* **String** *file* - path to a file

* **Regex** *reg* - regex that will be used to search the file

* **Array** *pairs* - an array of arrays, where each subarray is a [String, RegExp] pair

## textEqual(value, expected)

Assert that two strings are equal after standardization of newlines

### Params: 

* **String** *value* - a string

* **String** *expected* - the expected value of the string

## implement(subject, methods)

Assert an Object implements an interface

### Params: 

* **Object** *subject* - subject implementing the façade

* **Object|Array** *methods* - a façace, hash or array of keys to be implemented

<!-- End lib/test/assert.js -->

