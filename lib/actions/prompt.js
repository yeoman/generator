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

/**
 * Prompt's Separator for multi select Prompt
 * use in list's, rawlist's or checkbox's choices setting
 *
 * @usage choices: [ "A", new this.prompt.Separator(), "B" ]
 *        choices: [ "A", new this.prompt.Separator( "== Separator ==" ), "B"]
 * @constructor
 * @param {String} line   Separation line content (facultative)
 */

module.exports.Separator = inquirer.Separator;
