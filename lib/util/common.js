'use strict';
var chalk = require('chalk');

/**
 * Common/General utilities
 *
 * @mixin util/common
 */
var common = module.exports;

/**
 * 'Welcome to Yeoman' prompt intro
 * @type {String}
 * @memberof util/common
 */
common.yeoman =
'\n     _-----_' +
'\n    |       |' +
'\n    |' + chalk.red('--(o)--') + '|   .--------------------------.' +
'\n   `---------´  |    ' + chalk.yellow.bold('Welcome to Yeoman') + ',    |' +
'\n    ' + chalk.yellow('(') + ' _' + chalk.yellow('´U`') + '_ ' + chalk.yellow(')') + '   |   ' + chalk.yellow.bold('ladies and gentlemen!') + '  |' +
'\n    /___A___\\   \'__________________________\'' +
'\n     ' + chalk.yellow('|  ~  |') +
'\n   __' + chalk.yellow('\'.___.\'') + '__' +
'\n ´   ' + chalk.red('`  |') + '° ' + chalk.red('´ Y') + ' `\n';

/**
 * Create your own greeting, delivered by Yeoman.
 * @param {String} message
 */
common.greet = function (message) {
  var maxLines = 2;
  var maxLengthPerLine = 24;
  var lines = _parseMessage(message);
  var bottomLine = '\'__________________________\'';

  console.log(
    '\n     _-----_' +
    '\n    |       |' +
    '\n    |' + chalk.red('--(o)--') + '|   .--------------------------.' +
    '\n   `---------´  | ' + lines[0] + ' |' +
    '\n    ' + chalk.yellow('(') + ' _' + chalk.yellow('´U`') + '_ ' + chalk.yellow(')') + '   ' + (lines.length === 2 ? '| ' + lines[1] + ' |' : bottomLine) +
    '\n    /___A___\\   ' + (lines.length === 2 ? bottomLine : '') +
    '\n     ' + chalk.yellow('|  ~  |') +
    '\n   __' + chalk.yellow('\'.___.\'') + '__' +
    '\n ´   ' + chalk.red('`  |') + '° ' + chalk.red('´ Y') + ' `\n'
  );

  function _parseMessage(message) {
    var activeLine = 0;

    function _createLine(acc, str, index, array) {
      var spaceLeftForThisLine = maxLengthPerLine - acc[activeLine].length;

      if (str.length + 1 <= spaceLeftForThisLine) {
        if (acc[activeLine].length === 0) {
          acc[activeLine] += str;
        } else {
          acc[activeLine] += ' ' + str;
        }
      } else {
        acc[++activeLine] = str;
      }

      if (acc[activeLine].length === maxLengthPerLine && array[index + 1]) {
        acc[++activeLine] = '';
      }

      if (acc.length > maxLines) {
        throw new Error('Your message is won\'t fit.');
      }

      return acc;
    }

    function _padLine(str) {
      var padding = Array(Math.floor((maxLengthPerLine - str.length) / 2) + 1).join(' ');
      str = padding + str + padding;
      return (maxLengthPerLine - str.length > 0 ? ' ' : '' ) + str;
    }

    return message.trim().split(/\s/).reduce(_createLine, ['']).map(_padLine);
  }
};
