var path = require('path'),
  util = require('util'),
  yeoman = require('../../../../');

module.exports = Generator;

function Generator() {
  yeoman.generators.NamedBase.apply(this, arguments);

  this.hookFor('angular:crud-route', {
    args: [this.name, 'index']
  });

  this.hookFor('angular:crud-route', {
    args: [this.name, 'create']
  });

  this.hookFor('angular:crud-route', {
    args: [this.name, 'update']
  });

  this.hookFor('angular:crud-route', {
    args: [this.name, 'view']
  });

}

util.inherits(Generator, yeoman.generators.NamedBase);
