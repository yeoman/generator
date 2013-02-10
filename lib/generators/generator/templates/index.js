var generator = require('yeoman-generator');
var util      = require('util');

// Documentation: https://github.com/yeoman/generator/wiki/base

var Generator = module.exports = function Generator() {
  generator.Base.apply(this, arguments);
  // this.option('flag', { desc: 'Desc for flag', ...})
  // this.argument('filename', { desc: 'Desc for filename argument', ...})
};

util.inherits(Generator, generator.Base);

// Copies the entire template directory (with `.`, meaning the
// templates/ root) to the specified location
Generator.prototype.scaffold = function scaffold() {
  this.directory('.', 'place/to/generate');
};
