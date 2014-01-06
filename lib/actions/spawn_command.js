/** @module actions/spawn_command */
'use strict';
var _ = require('lodash');
var spawn = require('child_process').spawn;
var win32 = process.platform === 'win32';

/**
 * Normalize a command across OS and spawn it.
 *
 * @param {String} command
 * @param {Array} args
 */

module.exports = function spawnCommand(command, args, opt) {
  var winCommand = win32 ? 'cmd' : command;
  var winArgs = win32 ? ['/c'].concat(command, args) : args;
  opt = opt || {};

  return spawn(winCommand, winArgs, _.defaults({ stdio: 'inherit' }, opt));
};
