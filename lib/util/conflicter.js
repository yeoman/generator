'use strict';
const fs = require('fs');
const path = require('path');
const async = require('async');
const jsdiff = require('diff');
const _ = require('lodash');
const typedError = require('error/typed');
const binaryDiff = require('./binary-diff');

const AbortedError = typedError({
  type: 'AbortedError',
  message: 'Process aborted by user'
});

const ConflictError = typedError({
  type: 'ConflicterConflict',
  message: 'Process aborted by conflict'
});

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
 * @param  {Boolean} bail - When set to true, we will abort on first conflict. (used for
 *                           testing reproducibility)
 */
class Conflicter {
  constructor(adapter, force, options = {}) {
    if (typeof options === 'boolean') {
      this.bail = options;
    } else {
      this.bail = options.bail;
      this.ignoreWhitespace = options.ignoreWhitespace;
      this.skipRegenerate = options.skipRegenerate;
      this.dryRun = options.dryRun;
    }

    this.force = force === true;
    this.adapter = adapter;
    this.conflicts = [];

    this.diffOptions = options.diffOptions;

    if (this.bail) {
      // Set ignoreWhitespace as true by default for bail.
      // Probably just testing, so don't override.
      this.ignoreWhitespace = true;
      this.skipRegenerate = true;
    }

    if (this.dryRun) {
      // Ignore whitespace changes with "ignoreWhitespace === true" option
      this.skipRegenerate = true;
    }
  }

  /**
   * Add a file to conflicter queue
   *
   * @param {String} filepath - File destination path
   * @param {String} contents - File new contents
   * @param {Function} callback - callback to be called once we know if the user want to
   *                              proceed or not.
   */
  checkForCollision(filepath, contents, callback) {
    if (typeof contents === 'function') {
      const status = filepath.conflicter;
      callback = contents;
      contents = filepath.contents;
      filepath = filepath.path;
      if (status) {
        const log = this.adapter.log[status];
        if (log) {
          const rfilepath = path.relative(process.cwd(), filepath);
          log.call(this.adapter.log, rfilepath);
        }

        callback(null, status);
        return;
      }
    }

    this.conflicts.push({
      file: {
        path: path.resolve(filepath),
        contents
      },
      callback
    });
  }

  /**
   * Process the _potential conflict_ queue and ask the user to resolve conflict when they
   * occur
   *
   * The user is presented with the following options:
   *
   *   - `Y` Yes, overwrite
   *   - `n` No, do not overwrite
   *   - `a` All, overwrite this and all others
   *   - `x` Exit, abort
   *   - `d` Diff, show the differences between the old and the new
   *   - `h` Help, show this help
   *
   * @param  {Function} cb Callback once every conflict are resolved. (note that each
   *                       file can specify it's own callback. See `#checkForCollision()`)
   */
  resolve(cb) {
    cb = cb || (() => {});

    const resolveConflicts = conflict => {
      return next => {
        if (!conflict) {
          next();
          return;
        }

        this.collision(conflict.file, status => {
          // Remove the resolved conflict from the queue
          _.pull(this.conflicts, conflict);
          conflict.callback(null, status);
          next();
        });
      };
    };

    async.series(this.conflicts.map(resolveConflicts), cb.bind(this));
  }

  /**
   * Print the file differences to console
   *
   * @param  {Object}   file File object respecting this interface: { path, contents }
   */
  _printDiff(file) {
    if (file.binary === undefined) {
      file.binary = binaryDiff.isBinary(file.path, file.contents);
    }

    if (file.binary) {
      this.adapter.log.writeln(binaryDiff.diff(file.path, file.contents));
    } else {
      const existing = fs.readFileSync(file.path);
      this.adapter.diff(
        existing.toString(),
        (file.contents || '').toString(),
        file.changes
      );
    }
  }

  /**
   * Detect conflicts between file contents at `filepath` with the `contents` passed to the
   * function
   *
   * If `filepath` points to a folder, we'll always return true.
   *
   * Based on detect-conflict module
   *
   * @param  {Object}   file File object respecting this interface: { path, contents }
   * @return {Boolean} `true` if there's a conflict, `false` otherwise.
   */
  _detectConflict(file) {
    let contents = file.contents;
    const filepath = path.resolve(file.path);

    // If file path point to a directory, then it's not safe to write
    if (fs.statSync(filepath).isDirectory()) return true;

    if (file.binary === undefined) {
      file.binary = binaryDiff.isBinary(file.path, file.contents);
    }

    const actual = fs.readFileSync(path.resolve(filepath));

    if (!(contents instanceof Buffer)) {
      contents = Buffer.from(contents || '', 'utf8');
    }

    if (file.binary) {
      return actual.toString('hex') !== contents.toString('hex');
    }

    if (this.ignoreWhitespace) {
      file.changes = jsdiff.diffWords(
        actual.toString(),
        contents.toString(),
        this.diffOptions
      );
    } else {
      file.changes = jsdiff.diffLines(
        actual.toString(),
        contents.toString(),
        this.diffOptions
      );
    }

    const changes = file.changes;
    return changes.length > 1 || changes[0].added || changes[0].removed;
  }

  /**
   * Check if a file conflict with the current version on the user disk
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
   */
  collision(file, cb) {
    const rfilepath = path.relative(process.cwd(), file.path);

    if (!fs.existsSync(file.path)) {
      this.adapter.log.create(rfilepath);
      if (this.bail) {
        this.adapter.log.writeln('Aborting ...');
        throw new ConflictError();
      }

      if (this.dryRun) {
        cb('skip');
        return;
      }

      cb('create');
      return;
    }

    if (this.force) {
      this.adapter.log.force(rfilepath);
      cb('force');
      return;
    }

    if (this._detectConflict(file)) {
      this.adapter.log.conflict(rfilepath);
      if (this.bail) {
        this._printDiff(file);
        this.adapter.log.writeln('Aborting ...');
        throw new ConflictError();
      }

      if (this.dryRun) {
        this._printDiff(file);
        cb('skip');
        return;
      }

      this._ask(file, cb, 1);
    } else {
      this.adapter.log.identical(rfilepath);
      if (this.skipRegenerate) {
        cb('skip');
        return;
      }

      cb('identical');
    }
  }

  /**
   * Actual prompting logic
   * @private
   * @param {Object} file vinyl file object
   * @param {Function} cb callback receiving the next action
   * @param {Number} counter prompts
   */
  _ask(file, cb, counter) {
    const rfilepath = path.relative(process.cwd(), file.path);
    const prompt = {
      name: 'action',
      type: 'expand',
      message: `Overwrite ${rfilepath}?`,
      choices: [
        {
          key: 'y',
          name: 'overwrite',
          value: 'write'
        },
        {
          key: 'n',
          name: 'do not overwrite',
          value: 'skip'
        },
        {
          key: 'a',
          name: 'overwrite this and all others',
          value: 'force'
        },
        {
          key: 'x',
          name: 'abort',
          value: 'abort'
        }
      ]
    };

    // Only offer diff option for files
    if (fs.statSync(file.path).isFile()) {
      prompt.choices.push({
        key: 'd',
        name: 'show the differences between the old and the new',
        value: 'diff'
      });
    }

    this.adapter.prompt([prompt]).then(result => {
      if (result.action === 'abort') {
        this.adapter.log.writeln('Aborting ...');
        throw new AbortedError();
      }

      if (result.action === 'diff') {
        this._printDiff(file);

        counter++;
        if (counter === 5) {
          throw new Error(`Recursive error ${prompt.message}`);
        }

        return this._ask(file, cb, counter);
      }

      if (result.action === 'force') {
        this.force = true;
      }

      if (result.action === 'write') {
        result.action = 'force';
      }

      this.adapter.log[result.action || 'force'](rfilepath);
      return cb(result.action);
    });
  }
}

module.exports = Conflicter;
