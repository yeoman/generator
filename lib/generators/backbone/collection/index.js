/*jshint latedef:false */
var path = require('path'),
  util = require('util'),
  yeoman = require('../../../../');

module.exports = Generator;

function Generator() {
  yeoman.generators.NamedBase.apply(this, arguments);
  var dirPath = this.options.coffee ? '../templates/coffeescript/' : '../templates';
  this.sourceRoot(path.join(__dirname, dirPath));

  // required for collection.js template which uses `appname`
}

util.inherits(Generator, yeoman.generators.NamedBase);

Generator.prototype.createControllerFiles = function createControllerFiles() {
  var ext = this.options.coffee ? 'coffee' : 'js';
  this.template('collection.' + ext, path.join('app/scripts/collections', this.name + '-collection.' + ext));
};
