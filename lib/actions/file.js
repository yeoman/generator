var fs = require('fs');
var path = require('path');
var glob = require('glob');
var mkdirp = require('mkdirp');

var file = module.exports;

// Performs a glob search with the provided `pattern` and optional Hash of
// `options`. Options can be any option supported by
// [glob](https://github.com/isaacs/node-glob#options)
//
// - pattern  - Glob String pattern to look for
// - options  - Hash of options matching glob's option.
//
// Returns an Array of filenames matching the pattern
file.expand = function expand(pattern, options) {
  return glob.sync(pattern, options);
};

// Performs a glob search with the provided `pattern` and optional Hash of
// `options`, filtering results to only return files (not directories). Options
// can be any option supported by
// [glob](https://github.com/isaacs/node-glob#options)
//
// - pattern  - Glob String pattern to look for
// - options  - Hash of options matching glob's option.
//
// Returns an Array of filenames matching the pattern
file.expandFiles = function expandFiles(pattern, options) {
  options = options || {};
  var cwd = options.cwd || process.cwd();
  return this.expand(pattern, options).filter(function (filepath) {
    return fs.statSync(path.join(cwd, filepath)).isFile();
  });
};

// Checks a given file path being absolute or not. Borrowed to grunt's file API.
file.isPathAbsolute = function () {
  var filepath = path.join.apply(path, arguments);
  return path.resolve(filepath) === filepath;
};

// simple facade to mkdirp.sync
file.mkdir = mkdirp.sync.bind(mkdirp);
