var generator = require('../../..');
var util      = require('util');

var Generator = module.exports = function Generator() {
  generator.NamedBase.apply(this, arguments);
  // once supported, three flavors, raw fn, base Object, base wrapper.
  // this.option('flavor', {
  //   desc: 'Name of the generator to create',
  //   defaults: 'base'
  // });

  // same, should it be a local-to-project generator or an npm package?
  // this.option('npm', {
  //   type: Boolean
  // });
};

util.inherits(Generator, generator.NamedBase);

Generator.prototype.scaffold = function scaffold() {
  this.directory('.', this.name);
};
