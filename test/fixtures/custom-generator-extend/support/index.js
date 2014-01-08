var generators = require('../../../..');
var util = require('util');

var Generator = module.exports = function Generator(args, options) {
  generators.NamedBase.apply(this, arguments);
};

util.inherits(Generator, generators.NamedBase);
