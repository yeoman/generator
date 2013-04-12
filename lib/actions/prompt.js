'use strict';

var prompt_ = require('prompt');
var _ = require('lodash');
var exports = module.exports;


function evaluatePrompts(prompt) {
  if (_.isFunction(prompt.default)) {
    prompt.default = prompt.default();
  } else if (typeof prompt.default === 'boolean') {
    // Handle boolean defaults as confirmation prompts.
    var defaultMsg = prompt.default ? 'Y/n' : 'y/N';
    prompt.default = defaultMsg;

    prompt.validator = function (value) {
      return value.match(/^([yYnN]|(y\/N)|(Y\/n))$/);
    };
    prompt.required = true;

    prompt.before = function (val) {
      if (val === 'Y/n' || val.toLowerCase() === 'y') {
        return true;
      } else if (val === 'y/N' || val.toLowerCase() === 'n') {
        return false;
      }

      return val;
    };
  }

  return prompt;
}

// Prompt for user input based on the given Array of `prompts` to perform in
// series, and call `done` callback on completion.  `prompts` can be a single
// Hash of options in which case a single prompt is performed.
//
// Options can be any prompt's option: https://npmjs.org/package/prompt
//
// - prompts    - A single or an Array of Hash options.
// - done       - Callback to call on error or on completion.
//
// Returns the generator instance.
exports.prompt = function prompt(prompts, done) {
  prompts = Array.isArray(prompts) ? prompts : [prompts];

  prompts = prompts.map(evaluatePrompts);

  prompt_.message = '[' + '?'.green + ']';
  prompt_.delimiter = ' ';
  prompt_.start();

  var results = {};
  (function next(prompt) {
    function handleResult(err, value) {
      if (err) {
        return done(err);
      }

      results[prompt.name] = value;
      next(prompts.shift());
    }

    if (!prompt) {
      return done(null, results);
    }

    prompt_.get(prompt, handleResult);
  })(prompts.shift());

  return this;
};
