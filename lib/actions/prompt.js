var read = require('read');

var prompt = module.exports;

// Prompt for user input based on the given Array of `prompts` to perform in
// series, and call `done` callback on completion.  `prompts` can be a single
// Hash of options in which case a single prompt is performed.
//
// Options can be any read's option: https://github.com/isaacs/read#options
//
// - prompts    - A single or an Array of Hash options.
// - done       - Callback to call on error or on completion.
//
// Returns the generator instance.
prompt.prompt = function prompt(prompts, done) {
  prompts = Array.isArray(prompts) ? prompts : [prompts];

  var results = {};
  (function next(prompt) {
    if (!prompt) {
      return done(null, results);
    }

    if (!prompt.prompt) {
      prompt.prompt = prompt.message;
    }

    read(prompt, function (err, value) {
      if (err) {
        return done(err);
      }
      results[prompt.name] = value;
      next(prompts.shift());
    });
  })(prompts.shift());
  return this;
};
