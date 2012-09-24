
var path = require('path'),
    util = require('util'),
    yeoman = require('../../../../');

module.exports = Generator;

function Generator() {
  yeoman.generators.Base.apply(this, arguments);
  this.sourceRoot(path.join(__dirname, '../templates'));

  this.dirs = 'models collections views routes helpers templates'.split(' ');

  this.appname = path.basename(process.cwd());

  // the api to hookFor and pass arguments may vary a bit.
  this.hookFor('backbone:app', {
    args: [ 'application' ]
  });
  this.hookFor('backbone:router', {
    args: [ 'application' ]
  });
  this.hookFor('backbone:view', {
    args: [ 'application' ]
  });
  this.hookFor('backbone:model', {
    args: [ 'application' ]
  });
  this.hookFor('backbone:collection', {
    args: [ 'application' ]
  });
}

util.inherits(Generator, yeoman.generators.Base);


Generator.prototype.createDirLayout = function createDirLayout() {
  var self = this;
  this.dirs.forEach(function(dir) {
    self.log.create('app/scripts/' + dir);
    self.mkdir(path.join('app/scripts', dir));
  });
};

Generator.prototype.createAppFile = function createAppFile() {
  this.template('app.js', 'app/scripts/main.js');
};

