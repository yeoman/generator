

<!-- Start lib/actions/actions.js -->

## cacheRoot()

Stores and return the cache root for this class. The cache root is used to
`git clone` repositories from github by `.remote()` for example.

## copy(source, destination, process)

Make some of the file API aware of our source/destination root paths.
`copy`, `template` (only when could be applied/required by legacy code),
`write` and alike consider.

### Params: 

* **String** *source* 

* **String** *destination* 

* **Function** *process* 

## bulkCopy(source, destination, process)

Bulk copy
https://github.com/yeoman/generator/pull/359
https://github.com/yeoman/generator/issues/350

An optimized copy method for larger file trees.  Does not do
full conflicter checks, only check ir root directory is not empty.

### Params: 

* **String** *source* 

* **String** *destination* 

* **Function** *process* 

## read(filepath, encoding)

A simple method to read the content of the a file borrowed from Grunt:
https://github.com/gruntjs/grunt/blob/master/lib/grunt/file.js

Discussion and future plans:
https://github.com/yeoman/generator/pull/220

The encoding is `utf8` by default, to read binary files, pass the proper
encoding or null. Non absolute path are prefixed by the source root.

### Params: 

* **String** *filepath* 

* **String** *encoding* 

## write(filepath, content)

Writes a chunk of data to a given `filepath`, checking for collision prior
to the file write.

### Params: 

* **String** *filepath* 

* **String** *content* 

## checkForCollision(filepath, content, cb)

File collision checked. Takes a `filepath` (the file about to be written)
and the actual content. A basic check is done to see if the file exists, if
it does:

  1. Read its content from  `fs`
  2. Compare it with the provided content
  3. If identical, mark it as is and skip the check
  4. If diverged, prepare and show up the file collision menu

The menu has the following options:

  - `Y` Yes, overwrite
  - `n` No, do not overwrite
  - `a` All, overwrite this and all others
  - `q` Quit, abort
  - `d` Diff, show the differences between the old and the new
  - `h` Help, show this help

### Params: 

* **String** *filepath* 

* **String** *content* 

* **Function** *cb* 

## template(source, destination, data)

Gets a template at the relative source, executes it and makes a copy
at the relative destination. If the destination is not given it's assumed
to be equal to the source relative to destination.

Use configured engine to render the provided `source` template at the given
`destination`. `data` is an optional hash to pass to the template, if
undefined, executes the template in the generator instance context.

### Params: 

* **String** *source* 

* **String** *destination* 

* **Object** *data* 

## engine(body, data)

The engine method is the function used whenever a template needs to be rendered.

It uses the configured engine (default: underscore) to render the `body`
template with the provided `data`.

### Params: 

* **String** *body* 

* **Object** *data* 

## directory(source, destination, process)

Copies recursively the files from source directory to root directory.

### Params: 

* **String** *source* 

* **String** *destination* 

* **Function** *process* 

## bulkDirectory(source, destination, process)

Copies recursively the files from source directory to root directory.

### Params: 

* **String** *source* 

* **String** *destination* 

* **Function** *process* 

## remote(username, repo, branch, cb, refresh)

Remotely fetch a package on github, store this into a _cache folder, and
provide a &quot;remote&quot; object as a facade API to ourself (part of genrator API,
copy, template, directory). It's possible to remove local cache, and force
a new remote fetch of the package on Github.

### Examples:

    this.remote('user', 'repo', function(err, remote) {
      remote.copy('.', 'vendors/user-repo');
    });

### Params: 

* **String** *username* 

* **String** *repo* 

* **String** *branch* 

* **Function** *cb* 

* **Boolean** *refresh* 

<!-- End lib/actions/actions.js -->

