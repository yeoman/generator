
var path = require('path'),
  util = require('util'),
  yeoman = require('../../../../');

module.exports = Generator;

function Generator() {
  yeoman.generators.Base.apply(this, arguments);
  this.sourceRoot(path.join(__dirname, '../templates'));

  this.dirs = 'models controllers views routes helpers templates'.split(' ');

  this.hookFor('ember:app', {
    args: [ 'application' ]
  });

  this.hookFor('ember:view', {
    args: [ 'application' ]
  });

  this.hookFor('ember:model', {
    args: [ 'application' ]
  });

  this.hookFor('ember:controller', {
    args: [ 'application' ]
  });

  this.appname = path.basename(process.cwd());
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

Generator.prototype.createRouterFile = function createRouterFile() {
  this.template('router.js', 'app/scripts/routes/app-router.js');
};

Generator.prototype.createStoreFile = function createRouterFile() {
  this.template('store.js', 'app/scripts/store.js');
};


