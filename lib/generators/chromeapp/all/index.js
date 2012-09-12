var path = require('path');
var util = require('util');
var yeoman = require('../../../../');

module.exports = Generator;

function Generator() {
  yeoman.generators.Base.apply( this, arguments );
  this.sourceRoot( path.join( __dirname, 'templates' ) );
  this.appname = path.basename( process.cwd() );
  this.appPermissions = ['experimental'];
  this.warnOn('*');
}

util.inherits( Generator, yeoman.generators.NamedBase );

Generator.prototype.askFor = function askFor( argument ) {
  var cb = this.async();

  var prompts = [{
    name: 'appFullName',
    message: 'What would you like to call this application?',
    default: 'myChromeApp',
    warning: 'You can change the default application name.'
  }];

  this.prompt( prompts, function( err, props ) {
    if ( err ) {
      return this.emit( 'error', err );
    }
    this.appFullName = props.appFullName;
    cb();
  }.bind( this ));
};

Generator.prototype.writeFiles = function createManifest() {
  var data = {
    appFullName: this.appFullName,
    appPermissions: '"' + this.appPermissions.join('","') + '"'
  };

  this.directory( '.', '.' );
  this.template( 'app/index.html', path.join( 'app', 'index.html' ), data );
  this.template( 'app/manifest.json', path.join( 'app', 'manifest.json' ), data );
};
