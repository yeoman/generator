'use strict';
var chalk = require('chalk');
var pad = require('pad-component');
var wrap = require('word-wrap');

/**
 * Common/General utilities
 *
 * @mixin util/common
 */
var common = module.exports;

common._getGreeting = function (message, options) {
  message = message || 'Welcome to Yeoman, ladies and gentlemen!';
  options = options || {};

  var defaultGreeting =
    '\n     _-----_' +
    '\n    |       |    ' +
    '\n    |' + chalk.red('--(o)--') + '|    ' +
    '\n   `---------´   ' +
    '\n    ' + chalk.yellow('(') + ' _' + chalk.yellow('´U`') + '_ ' + chalk.yellow(')') + '    ' +
    '\n    /___A___\\    ' +
    '\n     ' + chalk.yellow('|  ~  |') + '     ' +
    '\n   __' + chalk.yellow('\'.___.\'') + '__   ' +
    '\n ´   ' + chalk.red('`  |') + '° ' + chalk.red('´ Y') + ' ` ';

  var maxLength = options.maxLength || 24;
  var topOffset = 3;
  var leftOffset = 17;

  var frame = {
    top: '.' + pad('', maxLength + 2, '-') + '.',
    side: '|',
    bottom: '\'' + pad('', maxLength + 2, '-') + '\''
  };

  return wrap(message.trim(), { width: maxLength })
    .split(/\n/)
    .reduce(function (greeting, str, index, array) {
      str = pad(str.trim(), maxLength);

      if (index === 0) {
        greeting[topOffset - 1] += frame.top;
      }

      greeting[index + topOffset] =
        (greeting[index + topOffset] || pad.left('', leftOffset)) +
        frame.side + ' ' + str + ' ' + frame.side;

      if (!array[index + 1]) {
        greeting[index + topOffset + 1] =
          (greeting[index + topOffset + 1] || pad.left('', leftOffset)) +
          frame.bottom;
      }

      return greeting;
    }, defaultGreeting.split(/\n/))
    .join('\n') + '\n';
};

/**
 * Create your own greeting, delivered by Yeoman.
 * @param {String} message
 */
common.greet = function (message, options) {
  console.log(common._getGreeting(message, options));
};

/**
 * 'Welcome to Yeoman' prompt intro
 * @type {String}
 * @memberof util/common
 */
common.yeoman = common._getGreeting();
