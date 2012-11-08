
var path = require('path'),
    util = require('util'),
    yeoman = require('../../../../');

module.exports = Generator;

function Generator() {
  yeoman.generators.Base.apply(this, arguments);

  var dirPath = this.options.coffee ? '../templates/coffeescript/' : '../templates';
  this.sourceRoot(path.join(__dirname, dirPath));

  this.dirs = 'models collections views routes helpers templates'.split(' ');

  this.option('coffee');
  this.appname = path.basename(process.cwd());

  var args = [ 'application' ];

  if (this.options.coffee) {
    args.push('--coffee');
  }

  // the api to hookFor and pass arguments may vary a bit.
  this.hookFor('backbone:app', {
    args: args
  });
  this.hookFor('backbone:router', {
    args: args
  });
  this.hookFor('backbone:view', {
    args: args
  });
  this.hookFor('backbone:model', {
    args: args
  });
  this.hookFor('backbone:collection', {
    args: args
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
  var ext = this.options.coffee ? 'coffee' : 'js';
  this.template('app.' + ext, 'app/scripts/main.' + ext);
};

