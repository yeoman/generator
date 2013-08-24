

<!-- Start lib/actions/file.js -->

## expand(pattern, options)

Performs a glob search with the provided pattern and optional Hash of
options. Options can be any option supported by
[glob](https://github.com/isaacs/node-glob#options)

### Params: 

* **String** *pattern* 

* **Object** *options* 

## expandFiles(pattern, options)

Performs a glob search with the provided pattern and optional Hash of
options, filtering results to only return files (not directories). Options
can be any option supported by
[glob](https://github.com/isaacs/node-glob#options)

### Params: 

* **String** *pattern* 

* **Object** *options* 

## isPathAbsolute()

Checks a given file path being absolute or not.
Borrowed from grunt's file API.

<!-- End lib/actions/file.js -->

