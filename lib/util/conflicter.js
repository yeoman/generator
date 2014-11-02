'use strict';

var fs = require('fs');
var path = require('path');
var assert = require('assert');
var async = require('async');
var isBinaryFile = require('isbinaryfile');
var _ = require('lodash');

var Conflicter = module.exports = function Conflicter(adapter) {
  this.force = false;
  this.adapter = adapter;
  this.conflicts = [];
};

Conflicter.prototype.add = function add(conflict) {
  assert(conflict.file, 'Missing conflict.file option');
  assert(conflict.content !== undefined, 'Missing conflict.content option');

  this.conflicts.push(conflict);
  return this;
};

Conflicter.prototype.pop = function pop() {
  return this.conflicts.pop();
};

Conflicter.prototype.shift = function shift() {
  return this.conflicts.shift();
};

Conflicter.prototype.resolve = function resolve(cb) {
  cb = cb || _.noop;
  var self = this;
  var resolveConflicts = function (conflict) {
    return function (next) {
      if (!conflict) return next();

      self.collision(conflict.file, conflict.content, function (status) {
        // Remove the resolved conflict from the queue
        _.pull(self.conflicts, conflict);
        conflict.callback(null, { status: status });
        next();
      });
    };
  };

  async.series(this.conflicts.map(resolveConflicts), cb.bind(this));
};

Conflicter.prototype._ask = function (filepath, content, cb) {
  var rfilepath = path.relative(process.cwd(), path.resolve(filepath));

  var config = [{
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
    }, {
      key: 'd',
      name: 'show the differences between the old and the new',
      value: 'diff'
    }]
  }];

  this.adapter.prompt(config, function (result) {
    if (result.action === 'abort') {
      this.adapter.log.writeln('Aborting ...');
      return process.exit(0);
    }

    if (result.action === 'diff') {
      this.adapter.diff(fs.readFileSync(filepath, 'utf8'), content);
      return this._ask(filepath, content, cb);
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

Conflicter.prototype.collision = function collision(filepath, content, cb) {
  var rfilepath = path.relative(process.cwd(), path.resolve(filepath));
  if (!fs.existsSync(filepath)) {
    this.adapter.log.create(rfilepath);
    return cb('create');
  }

  if (!fs.statSync(path.resolve(filepath)).isDirectory()) {
    var encoding = null;
    if (!isBinaryFile(path.resolve(filepath))) {
      encoding = 'utf8';
    }

    var actual = fs.readFileSync(path.resolve(filepath), encoding);

    // In case of binary content, `actual` and `content` are `Buffer` objects,
    // we just can't compare those 2 objects with standard `===`,
    // so we convert each binary content to an hexadecimal string first, and then compare them with standard `===`
    //
    // For not binary content, we can directly compare the 2 strings this way
    if ((!encoding && (actual.toString('hex') === content.toString('hex'))) ||
      (actual === content)) {
      this.adapter.log.identical(rfilepath);
      return cb('identical');
    }
  }

  if (this.force) {
    this.adapter.log.force(rfilepath);
    return cb('force');
  }

  this.adapter.log.conflict(rfilepath);
  this._ask(filepath, content, cb);
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

Conflicter.prototype.checkForCollision = function checkForCollision(filepath, content, cb) {
  this.add({
    file: filepath,
    content: content,
    callback: cb
  });
};
