'use strict';
var fs = require('fs');
var path = require('path');
var mkdirp = require('mkdirp');
var istextorbinary = require('istextorbinary');
var chalk = require('chalk');
var xdgBasedir = require('xdg-basedir');
var glob = require('glob');
var engine = require('../util/engines').underscore;

function isPathAbsolute() {
  var filepath = path.join.apply(path, arguments);
  return path.resolve(filepath) === filepath;
}

/**
 * @mixin
 * @alias actions/actions
 */
var actions = module.exports;

/**
 * Stores and return the cache root for this class. The cache root is used to
 * `git clone` repositories from github by `.remote()` for example.
 */

actions.cacheRoot = function cacheRoot() {
  return path.join(xdgBasedir.cache, 'yeoman');
};

// Copy helper for two versions of copy action
actions._prepCopy = function _prepCopy(source, destination, process) {
  destination = destination || source;

  if (typeof destination === 'function') {
    process = destination;
    destination = source;
  }

  source = isPathAbsolute(source) ? source : path.join(this.sourceRoot(), source);
  destination = isPathAbsolute(destination) ? destination : path.join(this.destinationRoot(), destination);

  var encoding = null;
  var body = fs.readFileSync(source);
  var isText = istextorbinary.isTextSync(undefined, body);

  if (isText) {
    body = body.toString();

    if (typeof process === 'function') {
      body = process(body, source, destination, {
        encoding: encoding
      });
    }
  }

  return {
    body: body,
    encoding: encoding,
    destination: destination,
    source: source
  };
};

/**
 * Make some of the file API aware of our source/destination root paths.
 * `copy`, `template` (only when could be applied/required by legacy code),
 * `write` and alike consider.
 *
 * @param {String} source      Source file to copy from. Relative to this.sourceRoot()
 * @param {String} destination Destination file to write to. Relative to this.destinationRoot()
 * @param {Function} process
 */

actions.copy = function copy(source, destination, process) {
  var file = this._prepCopy(source, destination, process);

  try {
    file.body = this.engine(file.body, this);
  } catch (err) {
    // this happens in some cases when trying to copy a JS file like lodash/underscore
    // (conflicting the templating engine)
  }

  this.fs.copy(file.source, file.destination, {
    process: function () {
      return file.body;
    }
  });

  return this;
};

/**
 * Bulk copy
 * https://github.com/yeoman/generator/pull/359
 * https://github.com/yeoman/generator/issues/350
 *
 * A copy method skipping templating and conflict checking. It will allow copying
 * a large amount of files without causing too many recursion errors. You should
 * never use this method, unless there's no other solution.
 *
 * @param {String} source      Source file to copy from. Relative to this.sourceRoot()
 * @param {String} destination Destination file to write to. Relative to this.destinationRoot()
 * @param {Function} process
 */

actions.bulkCopy = function bulkCopy(source, destination, process) {
  var file = this._prepCopy(source, destination, process);

  mkdirp.sync(path.dirname(file.destination));
  fs.writeFileSync(file.destination, file.body);

  // synchronize stats and modification times from the original file.
  var stats = fs.statSync(file.source);

  try {
    fs.chmodSync(file.destination, stats.mode);
    fs.utimesSync(file.destination, stats.atime, stats.mtime);
  } catch (err) {
    this.log.error('Error setting permissions of "' + chalk.bold(file.destination) + '" file: ' + err);
  }

  this.log.create(file.destination);
  return this;
};

/**
 * A simple method to read the content of a file borrowed from Grunt:
 * https://github.com/gruntjs/grunt/blob/master/lib/grunt/file.js
 *
 * Discussion and future plans:
 * https://github.com/yeoman/generator/pull/220
 *
 * The encoding is `utf8` by default, to read binary files, pass the proper
 * encoding or null. Non absolute path are prefixed by the source root.
 *
 * @param {String} filepath
 * @param {String} [encoding="utf-8"] Character encoding.
 */

actions.read = function read(filepath, encoding) {
  if (!isPathAbsolute(filepath)) {
    filepath = path.join(this.sourceRoot(), filepath);
  }

  var contents = this.fs.read(filepath, { raw: true });
  return contents.toString(encoding || 'utf8');
};

/**
 * Writes a chunk of data to a given `filepath`, checking for collision prior
 * to the file write.
 *
 * @param {String} filepath
 * @param {String} content
 * @param {Object} writeFile An object containing options for the file writing, as shown here: http://nodejs.org/api/fs.html#fs_fs_writefile_filename_data_options_callback
 */

actions.write = function write(filepath, content, writeFile) {
  this.fs.write(filepath, content);
  return this;
};

/**
 * Gets a template at the relative source, executes it and makes a copy
 * at the relative destination. If the destination is not given it's assumed
 * to be equal to the source relative to destination.
 *
 * Use configured engine to render the provided `source` template at the given
 * `destination`. The `destination` path is a template itself and supports variable
 * interpolation. `data` is an optional hash to pass to the template, if undefined,
 * executes the template in the generator instance context.
 *
 * use options to pass parameters to engine (like _.templateSettings)
 *
 * @param {String} source      Source file to read from. Relative to this.sourceRoot()
 * @param {String} destination Destination file to write to. Relative to this.destinationRoot().
 * @param {Object} data        Hash to pass to the template. Leave undefined to use the generator instance context.
 * @param {Object} options
 */

actions.template = function template(source, destination, data, options) {
  if (!destination || !isPathAbsolute(destination)) {
    destination = path.join(
      this.destinationRoot(),
      this.engine(destination || source, data || this, options)
    );
  }

  if (!isPathAbsolute(source)) {
    source = path.join(
      this.sourceRoot(),
      this.engine(source, data || this, options)
    );
  }

  var body = this.engine(this.fs.read(source), data || this, options);

  // Using copy to keep the file mode of the previous file
  this.fs.copy(source, destination, {
    process: function () {
      return body;
    }
  });

  return this;
};

/**
 * The engine method is the function used whenever a template needs to be rendered.
 *
 * It uses the configured engine (default: underscore) to render the `body`
 * template with the provided `data`.
 *
 * use options to pass paramters to engine (like _.templateSettings)
 *
 * @param {String} body
 * @param {Object} data
 * @param {Object} options
 */

actions.engine = function (body, data, options) {
  return engine.detect(body) ? engine(body, data, options) : body;
};

// Shared directory method
actions._directory = function _directory(source, destination, process, bulk) {
  // Only add sourceRoot if the path is not absolute
  var root = isPathAbsolute(source) ? source : path.join(this.sourceRoot(), source);
  var files = glob.sync('**', { dot: true, nodir: true, cwd: root });

  destination = destination || source;

  if (typeof destination === 'function') {
    process = destination;
    destination = source;
  }

  var cp = this.copy;

  if (bulk) {
    cp = this.bulkCopy;
  }

  // get the path relative to the template root, and copy to the relative destination
  for (var i in files) {
    var dest = path.join(destination, files[i]);
    cp.call(this, path.join(root, files[i]), dest, process);
  }

  return this;
};

/**
 * Copies recursively the files from source directory to root directory.
 *
 * @param {String} source      Source directory to copy from. Relative to this.sourceRoot()
 * @param {String} destination Directory to copy the source files into. Relative to this.destinationRoot().
 * @param {Function} process Receive in order: the body, the source path, the destination
 *                           path and a list of options containing the encoding. It should
 *                           return the new body.
 */

actions.directory = function directory(source, destination, process) {
  return this._directory(source, destination, process);
};

/**
 * Copies recursively the files from source directory to root directory.
 *
 * A copy method skiping templating and conflict checking. It will allow copying
 * a large amount of files without causing too much recursion errors. You should
 * never use this method, unless there's no other solution.
 *
 * @param {String} source      Source directory to copy from. Relative to this.sourceRoot()
 * @param {String} destination Directory to copy the source files into.Relative to this.destinationRoot().
 * @param {Function} process
 */

actions.bulkDirectory = function directory(source, destination, process) {
  // Join the source here because the conflicter will not run
  // until next tick, which resets the source root on remote
  // bulkCopy operations
  source = path.join(this.sourceRoot(), source);

  this.conflicter.checkForCollision(destination, null, function (err, status) {
    // create or force means file write, identical or skip prevent the
    // actual write.
    if (/force|create/.test(status)) {
      this._directory(source, destination, process, true);
    }
  }.bind(this));

  return this;
};
