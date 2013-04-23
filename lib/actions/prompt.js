'use strict';

var prompt_ = require('prompt');
var _ = require('lodash');
var validate = require('revalidator').validate;


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

// Monkey-patching prompt._performValidation to get rid of the overly verbose
// error message.
//
// Arguments:
// - name {Object} Variable name
// - prop {Object|string} Variable to get input for.
// - against {Object} Input
// - schema {Object} Validation schema
// - line {String|Boolean} Input line
// - callback {function} Continuation to pass control to when complete.
//
// Perfoms user input validation, print errors if needed and returns value
// according to validation
//
prompt_._performValidation = function (name, prop, against, schema, line, callback) {
  var numericInput, valid, msg;

  try {
    valid = validate(against, schema);
  } catch (err) {
    return (line !== -1) ? callback(err) : false;
  }

  if (!valid.valid) {
    msg = 'Invalid input';

    if (prompt_.colors) {
      prompt_.logger.error(msg);
    } else {
      prompt_.logger.error(msg);
    }

    if (prop.schema.message) {
      prompt_.logger.error(prop.schema.message);
    }

    prompt_.emit('invalid', prop, line);
  }

  return valid.valid;
};

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
module.exports = function prompt(prompts, done) {
  prompts = Array.isArray(prompts) ? prompts : [prompts];

  prompts = prompts.map(evaluatePrompts);

  prompt_.colors = false;
  prompt_.message = '[' + '?'.green + ']';
  prompt_.delimiter = ' ';
  prompt_.start();

  var results = {};
  (function next(prompt) {
    function handleResult(err, value) {
      if (err) {
        return done(err);
      }

      results[prompt.name] = value[prompt.name];
      next(prompts.shift());
    }

    if (!prompt) {
      return done(null, results);
    }

    prompt_.get(prompt, handleResult);
  })(prompts.shift());

  return this;
};
