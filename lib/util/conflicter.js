var logger = process.logging || require('./log');

var fs = require('fs');
var path = require('path');
var events = require('events');
var diff = require('diff');
var prompt = require('../actions/prompt').prompt;
var exists = fs.existsSync || path.existsSync;
var log = logger('conflicter');

var conflicter = module.exports = Object.create(events.EventEmitter.prototype);

conflicter.conflicts = [];

conflicter.add = function add(conflict) {
  if (typeof conflict === 'string') {
    conflict = {
      file: conflict,
      content: fs.readFileSync(conflict, 'utf8')
    };
  }

  if (!conflict.file) {
    throw new Error('Missing conflict.file option');
  }

  if (conflict.content === undefined) {
    throw new Error('Missing conflict.content option');
  }

  this.conflicts.push(conflict);
  return this;
};

conflicter.reset = function reset() {
  this.conflicts = [];
  return this;
};

conflicter.pop = function pop() {
  return this.conflicts.pop();
};

conflicter.shift = function shift() {
  return this.conflicts.shift();
};

conflicter.resolve = function resolve(cb) {
  var conflicts = this.conflicts;
  (function next(conflict) {
    if (!conflict) {
      return cb();
    }

    conflicter.collision(conflict.file, conflict.content, function (err, status) {
      if (err) {
        return cb(err);
      }

      conflicter.emit('resolved:'+  conflict.file, status);
      next(conflicts.shift());
    });

  })(conflicts.shift());
};

conflicter.collision = function collision(filepath, content, cb) {
  var self = this;
  var menu = [
    ' ' + 'Y'.bold + '    yes         overwrite',
    ' ' + 'n'.bold + '    no          do not overwrite',
    ' ' + 'a'.bold + '    all         overwrite this and all others',
    ' ' + 'q'.bold + '    quit        abort',
    ' ' + 'd'.bold + '    diff        show the differences between the old and the new',
    ' ' + 'h'.bold + '    help        show help'
  ].join('\n');

  if (!exists(filepath)) {
    log.create(filepath);
    return cb(null, 'create');
  }

  // TODO(mklabs): handle non utf8 file (images, etc.) and compare mtime instead,
  // something like that.
  var actual = fs.readFileSync(path.resolve(filepath), 'utf8');
  if (actual === content) {
    log.identical(filepath);
    return cb(null, 'identical');
  }

  if (self.force) {
    log.force(filepath);
    return cb(null, 'force');
  }

  log.conflict(filepath);

  log(menu);

  // for this particular use case, might use prompt module directly to avoid
  // the additional "Are you sure?" prompt
  (function ask() {
    var config = {
      message: ('Overwrite ' + filepath + '? (enter "h" for help) [Ynaqdh]?'),
      name: 'overwrite',
      default: 'h'
    };

    process.nextTick(function () {
      self.emit('prompt', config);
      self.emit('conflict', filepath);
    });

    prompt(config, function (err, result) {
      if (err) {
        return cb(err);
      }

      var answer = result.overwrite;

      var ok = 'Yynaqdh'.split('').some(function (valid) {
        return valid === answer;
      });

      if (answer === 'h' || !ok) {
        console.log(menu);
        return ask();
      }

      if (answer === 'n') {
        log.skip(filepath);
        return cb(null, 'skip');
      }

      if (answer === 'q') {
        log.writeln('Aborting...');
        return process.exit(0);
      }

      if (/Y|a/i.test(answer)) {
        log.force(filepath);
        if (answer === 'a') {
          self.force = true;
        }
        return cb(null, 'force');
      }

      if (answer === 'd') {
        console.log(conflicter.diff(fs.readFileSync(filepath, 'utf8'), content));
        return ask();
      }

      // default, even though we should have handled every possible value
      return cb();
    });
  })();
};

// below is borrowed code from visionmedia's excellent mocha (and its reporter)

conflicter.colors = {
  'diff added': 42,
  'diff removed': 41
};

conflicter.diff = function _diff(actual, expected) {
  var msg = diff.diffLines(actual, expected).map(function (str) {
    if (str.added) {
      return conflicter.colorLines('diff added', str.value);
    }

    if (str.removed) {
      return conflicter.colorLines('diff removed', str.value);
    }

    return str.value;
  }).join('');

  // legend
  msg = '\n' +
    conflicter.color('diff removed', 'removed') +
    ' ' +
    conflicter.color('diff added', 'added') +
    '\n\n' +
    msg +
    '\n';

  return msg;
};

conflicter.color = function (type, str) {
  return '\u001b[' + conflicter.colors[type] + 'm' + str + '\u001b[0m';
};

conflicter.colorLines = function colorLines(name, str) {
  return str.split('\n').map(function (str) {
    return conflicter.color(name, str);
  }).join('\n');
};
