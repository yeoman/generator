var _ = require('lodash');
var dargs = require('dargs');
var async = require('async');
var chalk = require('chalk');

var install = module.exports;

/**
 * Combine package manager cmd line arguments and run the `install` command.
 *
 * @param {String} installer Which package manager to use
 * @param {String|Array} paths Packages to install, empty string for `npm install`
 * @param {Object} options Options to invoke `install` with
 * @param {Function} cb
 */

install.runInstall = function (installer, paths, options, cb) {
  if (!cb && _.isFunction(options)) {
    cb = options;
    options = {};
  }

  options = options || {};
  cb = cb || function () {};
  paths = Array.isArray(paths) ? paths : (paths && paths.split(' ') || []);

  this.emit(installer + 'Install', paths);
  var args = ['install'].concat(paths).concat(dargs(options));

  this.spawnCommand(installer, args, cb)
    .on('error', cb)
    .on('exit', this.emit.bind(this, installer + 'Install:end', paths))
    .on('exit', function (err) {
      if (err === 127) {
        this.log.error('Could not find ' + installer + '. Please install with ' +
                            '`npm install -g ' + installer + '`.');
      }
      cb(err);
    }.bind(this));

  return this;
};

/**
 * Runs `npm` and `bower` in the generated directory concurrently and prints a
 * message to let the user know.
 *
 * ### Options:
 *
 *   - `npm` Boolean whether to run `npm install` (`true`)
 *   - `bower` Boolean whether to run `bower install` (`true`)
 *   - `skipInstall` Boolean whether to skip automatic installation (`false`)
 *   - `skipMessage` Boolean whether to show the used bower/npm commands (`false`)
 *
 * ### Examples:
 *
 *     this.installDependencies({
 *       bower: true,
 *       npm: true,
 *       skipInstall: false,
 *       callback: function () {
 *         console.log('Everything is ready!');
 *       }
 *     });
 *
 * @param {Object} options
 */

install.installDependencies = function (options) {
  var msg = {
    commands: [],
    template: _.template('\n\nI\'m all done. ' +
    '<%= skipInstall ? "Just run" : "Running" %> <%= commands %> ' +
    '<%= skipInstall ? "" : "for you " %>to install the required dependencies.' +
    '<% if (!skipInstall) { %> If this fails, try running the command yourself.<% } %>\n\n')
  };

  var commands = [];

  if (_.isFunction(options)) {
    options = {
      callback: options
    };
  }

  options = _.defaults(options || {}, {
    bower: true,
    npm: true,
    skipInstall: false,
    skipMessage: false,
    callback: function () {}
  });

  if (options.bower) {
    msg.commands.push('bower install');
    commands.push(function (cb) {
      this.bowerInstall(null, null, cb);
    }.bind(this));
  }

  if (options.npm) {
    msg.commands.push('npm install');
    commands.push(function (cb) {
      this.npmInstall(null, null, cb);
    }.bind(this));
  }

  if (msg.commands.length === 0) {
    throw new Error('installDependencies needs at least one of npm or bower to run.');
  }

  if (!options.skipMessage) {
    console.log(msg.template(_.extend(options, { commands: chalk.yellow.bold(msg.commands.join(' & ')) })));
  }

  if (!options.skipInstall) {
    async.parallel(commands, options.callback);
  }
};

/**
 * Receives a list of `paths`, and an Hash of `options` to install through bower.
 *
 * @param {String|Array} paths Packages to install
 * @param {Object} options Options to invoke `bower install` with, see `bower help install`
 * @param {Function} cb
 */

install.bowerInstall = function install(paths, options, cb) {
  return this.runInstall('bower', paths, options, cb);
};

/**
 * Receives a list of `paths`, and an Hash of `options` to install through npm.
 *
 * @param {String|Array} paths Packages to install
 * @param {Object} options Options to invoke `npm install` with, see `npm help install`
 * @param {Function} cb
 */

install.npmInstall = function install(paths, options, cb) {
  return this.runInstall('npm', paths, options, cb);
};
