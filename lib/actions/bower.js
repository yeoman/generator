var spawn = require('child_process').spawn;
var bower = module.exports;
var _ = require('lodash');


// Convert an object to an array of CLI arguments
function optsToArgs(options) {
  var args = [];

  Object.keys(options).forEach(function (flag) {
    var val = options[flag];

    flag = flag.replace(/[A-Z]/g, function (match) {
      return '-' + match.toLowerCase();
    });

    if (val === true) {
      args.push('--' + flag);
    }

    if (_.isString(val)) {
      args.push('--' + flag, val);
    }

    if (_.isNumber(val)) {
      args.push('--' + flag, '' + val);
    }

    if (_.isArray(val)) {
      val.forEach(function (arrVal) {
        args.push('--' + flag, arrVal);
      });
    }
  });

  return args;
}

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

  spawn('bower', ['install'].concat(paths).concat(optsToArgs(options)))
    .on('err', cb)
    .on('exit', this.emit.bind(this, 'install:end', paths))
    .on('exit', function (err) {
      if (err === 127) {
        this.log.error('Could not find bower. Please install with ' +
                       '`npm install -g bower`.');
      }
      cb(err);
    }.bind(this));

  return this;
};
