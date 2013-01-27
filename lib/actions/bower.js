var commands = require('bower').commands;

var bower = module.exports;

// TODO(mklabs): bower has quite a few dependencies, just like npm, consider
// spawning the `bower` command instead, with some gracefull fallback to
// local `./node_modules/.bin` folder and error handling

// Receives a list of `paths`, and an Hash of `options` to install through bower
//
// - paths     - A String or an Array of package name to install. Empty string for `bower install`
// - options   - [optional] The Hash of options to invoke bower.commands.install with. See `bower help install`.
// - callback   - [optional]
//
// Returns the generator instance.
bower.install = function install(paths, options, cb) {
  if (!cb) {
    cb = options;
    options = {};
  }

  cb = cb || function () {};
  paths = Array.isArray(paths) ? paths : (paths && paths.split(' ') || []);

  this.emit('install', paths);
  commands.install(paths, options)
    .on('data', console.error.bind(console))
    .on('error', cb)
    .on('end', cb)
    .on('end', this.emit.bind(this, 'install:end', paths));

  return this;
};
