
var events = require('events');
var grunt  = require('grunt');
var diff   = require('diff');
var path   = require('path');
var prompt = require('prompt');
var logger = process.logging || require('./log');

var log = logger('conflicter');

prompt.message = '\n';
prompt.delimiter = ' ';

var conflicter = module.exports = Object.create(events.EventEmitter.prototype);

conflicter.conflicts = [];

conflicter.add = function add(conflict) {
  this.conflicts.push(conflict);
  return this;
};

conflicter.resolve = function resolve(cb) {
  var conflicts = this.conflicts;
  (function next(conflict) {
    if(!conflict) {
      return cb();
    }

    conflicter.collision(conflict.file, conflict.content, function(err, status) {
      if(err) {
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

  if(!grunt.file.exists(filepath)) {
    log.create(filepath);
    return cb(null, 'create');
  }

  var actual = grunt.file.read(path.resolve(filepath));
  if(actual === content) {
    log.identical(filepath);
    return cb(null, 'identical');
  }

  if(self.force) {
    log.force(filepath);
    return cb(null, 'force');
  }

  log.conflict(filepath);

  console.log();
  console.log(menu);

  // for this particular use case, might use prompt module directly to avoid
  // the additional "Are you sure?" prompt
  (function ask() {
    prompt.start();
    prompt.getInput({
      message: ('Overwrite ' + filepath + '? (enter "h" for help) [Ynaqdh]?'),
      name: 'overwrite',
      default: 'h'
    }, function(err, answer) {
      if(err) {
        return cb(err);
      }

      var ok = 'Yynaqdh'.split('').some(function(valid) {
        return valid === answer;
      });

      if(answer === 'h' || !ok) {
        console.log(menu);
        return ask();
      }

      if(answer === 'n') {
        log.skip(filepath);
        return cb(null, 'skip');
      }

      if(answer === 'q') {
        log.writeln('Aborting...');
        return process.exit(0);
      }

      if(/Y|a/i.test(answer)) {
        log.force(filepath);
        if(answer === 'a') {
          self.force = true;
        }
        return cb(null, 'force');
      }

      if(answer === 'd') {
        console.log(conflicter.diff(grunt.file.read(filepath), content));
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
  var msg = diff.diffLines(actual, expected).map(function(str) {
    if (str.added) return conflicter.colorLines('diff added', str.value);
    if (str.removed) return conflicter.colorLines('diff removed', str.value);
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

conflicter.color = function(type, str) {
  return '\u001b[' + conflicter.colors[type] + 'm' + str + '\u001b[0m';
};

conflicter.colorLines = function colorLines(name, str) {
  return str.split('\n').map(function(str){
    return conflicter.color(name, str);
  }).join('\n');
};


