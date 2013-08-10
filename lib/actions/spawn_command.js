var spawn = require('child_process').spawn;
var win32 = process.platform === 'win32';

/**
 * Normalize a command across OS and spawn it.
 *
 * @param {String} command
 * @param {Array} args
 */

module.exports = function spawnCommand(command, args) {
  var winCommand = win32 ? 'cmd' : command;
  var winArgs = win32 ? ['/c'].concat(command, args) : args;

  return spawn(winCommand, winArgs, { stdio: 'inherit' });
};

