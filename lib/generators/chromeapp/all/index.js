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
  },
  {
    name: 'appDescription',
    message: 'How would you like to describe this application?',
    default: 'My Chrome app',
    warning: 'You can change the default app description.'
  }  
  ];

  this.prompt( prompts, function( err, props ) {
    if ( err ) {
      return this.emit( 'error', err );
    }
    this.appFullName = props.appFullName;
    this.appDescription = props.appDescription;
    cb();
  }.bind( this ));
};

Generator.prototype.writeFiles = function createManifest() {
  var data = {
    appFullName: this.appFullName,
    appDescription: this.appDescription,
    appPermissions: '"' + this.appPermissions.join('","') + '"'
  };

  this.directory( '.', '.' );
  
  this.template( 'app/index.html', path.join( 'app', 'index.html' ), data );
  this.template( 'app/manifest.json', path.join( 'app', 'manifest.json' ), data );
  this.template( 'app/_locales/en/messages.json', path.join( 'app', '_locales', 'en' , 'messages.json' ), data );
};
