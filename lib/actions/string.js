var _ = require('lodash');
_.str = require('underscore.string');

module.exports = _.str;
module.exports._ = _;

// Mix in non-conflicting functions to Underscore namespace and
// Generators.
//
// Examples
//
//    this.humanize('stuff-dash')
//    this.classify('hello-model');
//
_.mixin(_.str.exports());
