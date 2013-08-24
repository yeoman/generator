'use strict';

var inquirer = require('inquirer');

/**
 * Prompt for user input based on the given Array of `prompts` to perform in
 * series, and call `done` callback on completion.
 *
 * @params {Object[]} prompts
 * @params {Function} done
 */

module.exports = function prompt() {
  inquirer.prompt.apply(inquirer, arguments);
  return this;
};
