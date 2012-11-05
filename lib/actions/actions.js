var fs     = require('fs');
var path   = require('path');
var grunt  = require('grunt');
var events = require('events');
var mime   = require('mime');
var _      = grunt.util._;
var logger = process.logging || require('./utils/log');
var log    = logger('generators:action');

// The action mixin is comprised of Grunt's file, log, helper and prompt API,
// and made available for generators to use as instance methods directly for
// the file API, and through the `log` property for the log API.

var actions = module.exports;

// File API
// --------
// 1:1 relationship with grunt.file.
_.extend(actions, grunt.file);

// Helper API
// ----------
// 1:1 relationship with grunt.helper
actions.helper = grunt.helper;

// Prompts API
// -----------
// 1:1 relationship with grunt.helpers for prompt, prompt_for, and
// prompt_for_obj
actions.prompt = grunt.helper.bind(grunt, 'prompt');
actions.promptFor = grunt.helper.bind(grunt, 'prompt_for');
actions.promptForObj = grunt.helper.bind(grunt, 'prompt_for_obj');

// Log API
// -------
// as self.log property. 1:1 relationship with grunt.log
actions.log = log;

// Internal API
// ------------
// Specifics of our generator API, additonal logic and tweaks to file behaviour
// and so on.

// Stores and return the source root for this class
actions.sourceRoot = function sourceRoot(root) {
  if( root ) {
    this._sourceRoot = path.resolve( root );
  }

  return this._sourceRoot;
};

// Sets the destination root for this class. Relatives path are added to the
// directory where the script was invoked and expanded.
actions.destinationRoot = function destinationRoot(root) {
  if( root ) {
    this._destinationRoot = path.resolve( root );

    if ( !path.existsSync( root ) ) {
      this.mkdir( root );
    }

    process.chdir( root );
  }

  return this._destinationRoot || './';
};

// Make some of the file API aware of our source / destination root paths.
// copy, template, write and alike consider:
//
// - the source path to be relative to generator's `templates/` directory.
// - the destination path to be relative to application Gruntfile's directory
// (most likely cwd)
actions.copy = function copy(source, destination, options) {
  source = this.isPathAbsolute(source) ? source : path.join(this.sourceRoot(), source);
  this.checkForCollision(destination, grunt.file.read(source), function(err, status) {
    if(err) {
      return this.emit('error', err);
    }

    // create or force means file write, identical or skip prevent the
    // actual write
    if(/force|create/.test(status)) {
      grunt.file.copy(source, destination, options);
    }
  });
  return this;
};

actions.read = function read(source, encoding) {
  source = this.isPathAbsolute(source) ? source : path.join(this.sourceRoot(), source);
  return grunt.file.read(source, encoding);
};

actions.write = function write(filepath, content) {
  this.checkForCollision(filepath, content, function(err, status) {
    if(err) {
      return this.emit('error', err);
    }

    // create or force means file write, identical or skip prevent the
    // actual write
    if(/force|create/.test(status)) {
      grunt.file.write(filepath, content);
    }
  });
  return this;
};

// File collision checked. Takes a `filepath` (the file about to be written)
// and the actual content. A basic check is done to see if the file exists, it it does:
//
// 1. read its content from FS
// 2. compare it with content provided
// 3. if identical, mark it as is and skip the check
// 4. if diverged, prepare and show up the file collision menu
//
// The menu has the following options:
//
// - Y - yes, overwrite
// - n - no, do not overwrite
// - a - all, overwrite this and all others
// - q - quit, abort
// - d - diff, show the differences between the old and the new
// - h - help, show this help
actions.checkForCollision = function checkForCollision(filepath, content, cb) {
  this.conflicter.add({
    file: filepath,
    content: content
  });

  this.conflicter.once('resolved:' + filepath, cb.bind(this, null));
};

// Gets an underscore template at the relative source, executes it and makes a copy
// at the relative destination. If the destination is not given it's assumed
// to be equal to the source relative to destination.
actions.template = function template(source, destination, data) {
  // data is meant to be the whole instance for now. Will change.
  data = data || this;
  destination = destination || source;

  var body = grunt.template.process(this.read(source), data);
  this.write(destination, body);
  return this;
};

// Copies recursively the files from source directory to root directory
actions.directory = function directory(source, destination, noProcess) {
  var root = path.join(this.sourceRoot(), source);
  var list = grunt.file.expandFiles({ dot: true }, path.join(root, '**'));

  destination = destination || source;

  // get the path relative to the template root, and copy to the relative destination
  (function next(filepath, self) {
    if(!filepath) {
      self.emit('directory:end');
      return;
    }

    var src = filepath.slice(root.length);
    var dest = path.join(destination, src);
    var body = grunt.file.read(filepath);

    // failsafe no process check for image like extensions
    var img = /image/.test(mime.lookup(filepath));

    self.copy(filepath, dest, {
      noProcess: img || noProcess,
      process: function(content) {
        return grunt.template.process(content, self);
      }
    });

    return next(list.shift(), self);
  })(list.shift(), this);
};

// Remotely fetch a package on github, store this into a _cache folder,
// and provide a "remote" object as an a facade API to ourself (part of
// genrator API, copy, template, directory)
actions.remote = function(username, repo, branch, cb) {
  if(!cb) { cb = branch; branch = 'master'; }

  var self = this;
  var home = process.env.HOME || process.env.USERPROFILE;
  var cache = path.join(home, '.yeoman/cache', username, repo, branch);
  var url = 'http://github.com/' + [username, repo, 'archive', branch].join('/') + '.tar.gz';

  fs.stat(cache, function(err) {
    // already cached
    if ( !err ) {
      return done();
    }
    // first time fetch
    self.tarball(url, cache, done);
  });

  // XXX remote should probably be in its own file,
  function done(err) {
    if ( err ) {
      return cb( err );
    }

    var files = grunt.file.expandFiles(path.join(cache, '**')).map(function(filepath) {
      return filepath.slice(cache.length + 1);
    });

    var remote = {};

    remote.cachePath = cache;

    remote.copy = function copy(source, destination, options) {
      source = path.join(cache, source);
      self.copy(source, destination, options);
      return this;
    };

    remote.template = function template(source, destination, data) {
      // data is meant to be the whole instance for now. Will change.
      data = data || self;
      destination = destination || source;
      source = path.join(cache, source);

      var body = grunt.template.process(grunt.file.read(source), data);
      self.write(destination, body);
    };

    remote.directory = function directory(source, destination) {
      var root = self.sourceRoot();
      self.sourceRoot(cache);
      self.directory(source, destination);
      self.sourceRoot(root);
    };

    cb(err, remote, files);
  }
};
