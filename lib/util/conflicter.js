'use strict';
var fs = require('fs');
var path = require('path');
var util = require('util');
var async = require('async');
var detectConflict = require('detect-conflict');
var _ = require('lodash');
var binaryDiff = require('./binary-diff');
var pathExists = require('path-exists');

/**
 * The Conflicter is a module that can be used to detect conflict between files. Each
 * Generator file system helpers pass files through this module to make sure they don't
 * break a user file.
 *
 * When a potential conflict is detected, we prompt the user and ask them for
 * confirmation before proceeding with the actual write.
 *
 * @constructor
 * @property {Boolean} force - same as the constructor argument
 *
 * @param  {TerminalAdapter} adapter - The generator adapter
 * @param  {Boolean} force - When set to true, we won't check for conflict. (the
 *                           conflicter become a passthrough)
 */
var Conflicter = module.exports = function Conflicter(adapter, force) {
  this.force = force === true;
  this.adapter = adapter;
  this.conflicts = [];
};

/**
 * Add a file to conflicter queue.
 *
 * @param {String} filepath - File destination path
 * @param {String} contents - File new contents
 * @param {Function} callback - callback to be called once we know if the user want to
 *                              proceed or not.
 */
Conflicter.prototype.checkForCollision = function (filepath, contents, callback) {
  this.conflicts.push({
    file: {
      path: path.resolve(filepath),
      contents: contents
    },
    callback: callback
  });
};

/**
 * Process the _potential conflict_ queue and ask the user to resolve conflict when they
 * occur.
 *
 * The user is presented with the following options:
 *
 *   - `Y` Yes, overwrite
 *   - `n` No, do not overwrite
 *   - `a` All, overwrite this and all others
 *   - `q` Quit, abort
 *   - `d` Diff, show the differences between the old and the new
 *   - `h` Help, show this help
 *
 * @param  {Function} cb Callback once every conflict are resolved. (note that each
 *                       file can specify it's own callback. See `#checkForCollision()`)
 */
Conflicter.prototype.resolve = function (cb) {
  cb = cb || _.noop;

  var self = this;
  var resolveConflicts = function (conflict) {
    return function (next) {
      if (!conflict) {
        next();
        return;
      }

      self.collision(conflict.file, function (status) {
        // Remove the resolved conflict from the queue
        _.pull(self.conflicts, conflict);
        conflict.callback(null, status);
        next();
      });
    };
  };

  async.series(this.conflicts.map(resolveConflicts), cb.bind(this));
};

/**
 * Check if a file conflict with the current version on the user disk.
 *
 * A basic check is done to see if the file exists, if it does:
 *
 *   1. Read its content from  `fs`
 *   2. Compare it with the provided content
 *   3. If identical, mark it as is and skip the check
 *   4. If diverged, prepare and show up the file collision menu
 *
 * @param  {Object}   file File object respecting this interface: { path, contents }
 * @param  {Function} cb Callback receiving a status string ('identical', 'create',
 *                       'skip', 'force')
 * @return {null} nothing
 */
Conflicter.prototype.collision = function (file, cb) {
  var rfilepath = path.relative(process.cwd(), file.path);

  if (!pathExists.sync(file.path)) {
    this.adapter.log.create(rfilepath);
    cb('create');
    return;
  }

  if (this.force) {
    this.adapter.log.force(rfilepath);
    cb('force');
    return;
  }

  if (detectConflict(file.path, file.contents)) {
    this.adapter.log.conflict(rfilepath);
    this._ask(file, cb);
  } else {
    this.adapter.log.identical(rfilepath);
    cb('identical');
  }
};

/**
 * Actual prompting logic
 * @private
 * @param {Object} file
 * @param {Function} cb
 */
Conflicter.prototype._ask = function (file, cb) {
  var rfilepath = path.relative(process.cwd(), file.path);
  var prompt = {
    name: 'action',
    type: 'expand',
    message: 'Overwrite ' + rfilepath + '?',
    choices: [{
      key: 'y',
      name: 'overwrite',
      value: 'write'
    }, {
      key: 'n',
      name: 'do not overwrite',
      value: 'skip'
    }, {
      key: 'a',
      name: 'overwrite this and all others',
      value: 'force'
    }, {
      key: 'x',
      name: 'abort',
      value: 'abort'
    }]
  };

  // Only offer diff option for files
  if (fs.statSync(file.path).isFile()) {
    prompt.choices.push({
      key: 'd',
      name: 'show the differences between the old and the new',
      value: 'diff'
    });
  }

  this.adapter.prompt([prompt], function (result) {
    if (result.action === 'abort') {
      this.adapter.log.writeln('Aborting ...');
      return process.exit(0);
    }

    if (result.action === 'diff') {
      if (binaryDiff.isBinary(file.path, file.contents)) {
        this.adapter.log.writeln(binaryDiff.diff(file.path, file.contents));
      } else {
        var existing = fs.readFileSync(file.path);
        this.adapter.diff(existing.toString(), file.contents.toString());
      }

      return this._ask(file, cb);
    }

    if (result.action === 'force') {
      this.force = true;
    }

    if (result.action === 'write') {
      result.action = 'force';
    }

    this.adapter.log[result.action](rfilepath);
    return cb(result.action);
  }.bind(this));
};
