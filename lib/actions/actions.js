var logger = process.logging || require('../util/log');
var log = logger('generators:action');

var fs = require('fs');
var path = require('path');
var events = require('events');
var mkdirp = require('mkdirp');
var isBinaryFile = require('isbinaryfile');
var rimraf = require('rimraf');
var async = require('async');
var iconv = require('iconv-lite');
var chalk = require('chalk');

var actions = module.exports;

actions.log = log;

/**
 * Stores and return the source root for this class. The source root is used to
 * prefix filepath with `.read()` or `.template()`.
 *
 * @param {String} root
 */

actions.sourceRoot = function sourceRoot(root) {
  if (root) {
    this._sourceRoot = path.resolve(root);
  }

  return this._sourceRoot;
};

/**
 * Sets the destination root for this class, the working directory. Relative
 * path are added to the directory where the script was invoked and
 * expanded.
 *
 * This automatically creates the working directory if it doensn't exists and
 * `cd` into it.
 *
 * @param {String} root
 */

actions.destinationRoot = function destinationRoot(root) {
  if (root) {
    this._destinationRoot = path.resolve(root);

    if (!fs.existsSync(root)) {
      this.mkdir(root);
    }

    process.chdir(root);
  }

  return this._destinationRoot || './';
};

/**
 * Stores and return the cache root for this class. The cache root is used to
 * `git clone` repositories from github by `.remote()` for example.
 */

actions.cacheRoot = function cacheRoot() {
  // we follow XDG specs if possible:
  // http://standards.freedesktop.org/basedir-spec/basedir-spec-latest.html
  if (process.env.XDG_CACHE_HOME) {
    return path.join(process.env.XDG_CACHE_HOME, 'yeoman');
  }

  // otherwise, we fallback to a temp dir in the home
  var home = process.env[process.platform === 'win32' ? 'USERPROFILE' : 'HOME'];
  return path.join(home, '.cache/yeoman');
};

/**
 * Make some of the file API aware of our source/destination root paths.
 * `copy`, `template` (only when could be applied/required by legacy code),
 * `write` and alike consider.
 *
 * @param {String} source
 * @param {String} destination
 * @param {Function} process
 */

actions.copy = function copy(source, destination, process) {
  var body;
  destination = destination || source;

  if (typeof destination === 'function') {
    process = destination;
    destination = source;
  }

  source = this.isPathAbsolute(source) ? source : path.join(this.sourceRoot(), source);

  var encoding = null;
  var binary = isBinaryFile(source);
  if (!binary) {
    encoding = 'utf8';
  }

  body = fs.readFileSync(source, encoding);

  if (typeof process === 'function' && !binary) {
    body = process(body, source, destination, {
      encoding: encoding
    });
  }

  try {
    body = this.engine(body, this);
  } catch (err) {
    // this happens in some cases when trying to copy a JS file like lodash/underscore
    // (conflicting the templating engine)
  }

  this.checkForCollision(destination, body, function (err, config) {
    var stats;

    if (err) {
      config.callback(err);
      return this.emit('error', err);
    }

    // create or force means file write, identical or skip prevent the
    // actual write.
    if (!(/force|create/.test(config.status))) {
      return config.callback();
    }

    mkdirp.sync(path.dirname(destination));
    fs.writeFileSync(destination, body);

    // synchronize stats and modification times from the original file.
    stats = fs.statSync(source);
    try {
      fs.chmodSync(destination, stats.mode);
      fs.utimesSync(destination, stats.atime, stats.mtime);
    } catch (err) {
      this.log.error('Error setting permissions of "' + chalk.bold(destination) + '" file: ' + err);
    }

    config.callback();
  }.bind(this));

  return this;
};

/**
 * A simple method to read the content of the a file borrowed from Grunt:
 * https://github.com/gruntjs/grunt/blob/master/lib/grunt/file.js
 *
 * Discussion and future plans:
 * https://github.com/yeoman/generator/pull/220
 *
 * The encoding is `utf8` by default, to read binary files, pass the proper
 * encoding or null. Non absolute path are prefixed by the source root.
 *
 * @param {String} filepath
 * @param {String} encoding
 */

actions.read = function read(filepath, encoding) {
  var contents;

  if (!this.isPathAbsolute(filepath)) {
    filepath = path.join(this.sourceRoot(), filepath);
  }

  try {
    contents = fs.readFileSync(String(filepath));

    // if encoding is not explicitly null, convert from encoded buffer to a
    // string. if no encoding was specified, use the default.
    if (encoding !== null) {
      contents = iconv.decode(contents, encoding || 'utf8');

      // strip any BOM that might exist.
      if (contents.charCodeAt(0) === 0xFEFF) {
        contents = contents.substring(1);
      }
    }

    return contents;
  } catch (e) {
    throw new Error('Unable to read "' + filepath + '" file (Error code: ' + e.code + ').');
  }
};

/**
 * Writes a chunk of data to a given `filepath`, checking for collision prior
 * to the file write.
 *
 * @param {String} filepath
 * @param {String} content
 */

actions.write = function write(filepath, content) {
  this.checkForCollision(filepath, content, function (err, config) {
    if (err) {
      config.callback(err);
      return this.emit('error', err);
    }

    // create or force means file write, identical or skip prevent the
    // actual write
    if (/force|create/.test(config.status)) {
      mkdirp.sync(path.dirname(filepath));
      fs.writeFileSync(filepath, content);
    }

    config.callback();
  });
  return this;
};

/**
 * File collision checked. Takes a `filepath` (the file about to be written)
 * and the actual content. A basic check is done to see if the file exists, if
 * it does:
 *
 *   1. Read its content from  `fs`
 *   2. Compare it with the provided content
 *   3. If identical, mark it as is and skip the check
 *   4. If diverged, prepare and show up the file collision menu
 *
 * The menu has the following options:
 *
 *   - `Y` Yes, overwrite
 *   - `n` No, do not overwrite
 *   - `a` All, overwrite this and all others
 *   - `q` Quit, abort
 *   - `d` Diff, show the differences between the old and the new
 *   - `h` Help, show this help
 *
 * @param {String} filepath
 * @param {String} content
 * @param {Function} cb
 */

actions.checkForCollision = function checkForCollision(filepath, content, cb) {
  this.conflicter.add({
    file: filepath,
    content: content
  });

  this.conflicter.once('resolved:' + filepath, cb.bind(this, null));
};

/**
 * Gets a template at the relative source, executes it and makes a copy
 * at the relative destination. If the destination is not given it's assumed
 * to be equal to the source relative to destination.
 *
 * Use configured engine to render the provided `source` template at the given
 * `destination`. `data` is an optional hash to pass to the template, if
 * undefined, executes the template in the generator instance context.
 *
 * @param {String} source
 * @param {String} destination
 * @param {Object} data
 */

actions.template = function template(source, destination, data) {
  data = data || this;
  destination = destination || source;

  var body = this.read(source, 'utf8');
  body = this.engine(body, data);

  this.write(destination, body);
  return this;
};

/**
 * The engine method is the function used whenever a template needs to be rendered.
 *
 * It uses the configured engine (default: underscore) to render the `body`
 * template with the provided `data`.
 *
 * @param {String} body
 * @param {Object} data
 */

actions.engine = function engine(body, data) {
  if (!this._engine) {
    throw new Error('Trying to render template without valid engine.');
  }

  return this._engine.detect && this._engine.detect(body) ?
    this._engine(body, data) :
    body;
};

/**
 * Copies recursively the files from source directory to root directory.
 *
 * @param {String} source
 * @param {String} destination
 * @param {Function} process
 */

actions.directory = function directory(source, destination, process) {
  var root = path.join(this.sourceRoot(), source);
  var files = this.expandFiles('**', { dot: true, cwd: root });
  var self = this;

  destination = destination || source;

  if (typeof destination === 'function') {
    process = destination;
    destination = source;
  }

  // get the path relative to the template root, and copy to the relative destination
  var resolveFiles = function (filepath) {
    return function (next) {
      if (!filepath) {
        self.emit('directory:end');
        return next();
      }

      var dest = path.join(destination, filepath);
      self.copy(path.join(root, filepath), dest, process);

      return next();
    };
  };

  async.parallel(files.map(resolveFiles));

  return this;
};

/**
 * Remotely fetch a package on github, store this into a _cache folder, and
 * provide a "remote" object as a facade API to ourself (part of genrator API,
 * copy, template, directory). It's possible to remove local cache, and force
 * a new remote fetch of the package on Github.
 *
 * ### Examples:
 *
 *     this.remote('user', 'repo', function(err, remote) {
 *       remote.copy('.', 'vendors/user-repo');
 *     });
 *
 * @param {String} username
 * @param {String} repo
 * @param {String} branch
 * @param {Function} cb
 * @param {Boolean} refresh
 */

actions.remote = function (username, repo, branch, cb, refresh) {
  if (!cb) {
    cb = branch;
    branch = 'master';
  }

  var self = this;
  var cache = path.join(this.cacheRoot(), username, repo, branch);
  var url = 'http://github.com/' + [username, repo, 'archive', branch].join('/') + '.tar.gz';

  fs.stat(cache, function (err) {
    // already cached
    if (!err) {
      // no refresh, so we can use this cache
      if (!refresh) {
        return done();
      }

      // otherwise, we need to remove it, to fetch it again
      rimraf(cache, function (err) {
        if (err) {
          return cb(err);
        }
        self.tarball(url, cache, done);
      });

    } else {
      self.tarball(url, cache, done);
    }
  });

  function done(err) {
    if (err) {
      return cb(err);
    }

    var files = self.expandFiles('**', { cwd: cache, dot: true });

    var remote = {};
    remote.cachePath = cache;

    // simple proxy to `.copy(source, destination)`
    remote.copy = function copy(source, destination) {
      source = path.join(cache, source);
      self.copy(source, destination);
      return this;
    };

    // same as `.template(source, destination, data)`
    remote.template = function template(source, destination, data) {
      data = data || self;
      destination = destination || source;
      source = path.join(cache, source);

      var body = self.engine(self.read(source), data);
      self.write(destination, body);
    };

    // same as `.template(source, destination)`
    remote.directory = function directory(source, destination) {
      var root = self.sourceRoot();
      self.sourceRoot(cache);
      self.directory(source, destination);
      self.sourceRoot(root);
    };

    cb(err, remote, files);
  }

  return this;
};
