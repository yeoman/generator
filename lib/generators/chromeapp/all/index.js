var path = require('path');
var util = require('util');
var yeoman = require('../../../../');

module.exports = Generator;

function Generator() {
  yeoman.generators.Base.apply( this, arguments );
  this.sourceRoot( path.join( __dirname, 'templates' ) );
  this.appname = path.basename( process.cwd() );
  this.appPermissions = {
  };
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
  },
  {
    name: 'unlimtedStoragePermission',
    message: 'Would you like to use Storage in your app',
    default: "Y/n",
    warning: 'You can change the permissions'
  },
  {
    name: 'identityPermission',
    message: 'Would you like to the experimental Identity API in your app',
    default: "Y/n",
    warning: 'You can change the permissions'
  },
  {
    name: 'browserTagPermission',
    message: 'Would you like to use the Browser Tag in your app',
    default: "Y/n",
    warning: 'You can change the permissions' 
  },
  {
    name: 'videoCapturePermission',
    message: 'Would you like to use the Camera in your app',
    default: "Y/n",
    warning: 'You can change the permissions'
  },
  {
    name: 'audioCapturePermission',
    message: 'Would you like to use the Microphone in your app',
    default: "Y/n",
    warning: 'You can change the permissions'
  },
  {
    name: 'usbPermission',
    message: 'Would you like to use USB in your app',
    default: "Y/n",
    warning: 'You can change the permissions'
  },
  {
    name: 'bluetoothPermission',
    message: 'Would you like to use Bluetooth in your app',
    default: "Y/n",
    warning: 'You can change the permissions'
  },
  {
    name: 'serialPermission',
    message: 'Would you like to use the Serial Port in your app',
    default: "Y/n",
    warning: 'You can change the permissions'
  },
  {
    name: 'udpsendPermission',
    message: 'Would you like to send UDP data in your app',
    default: "Y/n",
    warning: 'You can change the permissions'
  },
  {
    name: 'udpbindPermission',
    message: 'Would you like to receive UDP data in your app',
    default: "Y/n",
    warning: 'You can change the permissions'
  },
  {
    name: 'tcpPermission',
    message: 'Would you like to use TCP in your app?',
    default: "Y/n",
    warning: 'You can change the permissions'
  },
  {
    name: 'mediagalleryPermission',
    message: 'Would you like to use the Media Gallery API in your app?',
    default: "Y/n",
    warning: 'You can change the permissions'
  }

  ];

  this.prompt( prompts, function( err, props ) {
    if ( err ) {
      return this.emit( 'error', err );
    }
    this.appFullName = props.appFullName;
    this.appDescription = props.appDescription
    this.appPermissions.serial = (/y/i).test(props.serialPermission);
    this.appPermissions.identity = (/y/i).test(props.identityPermission);
    this.appPermissions.unlimitedStorage = (/y/i).test(props.unlimitedStoragePermission);
    this.appPermissions.usb = (/y/i).test(props.usbPermission);
    this.appPermissions.bluetooth = (/y/i).test(props.bluetoothPermission);
    this.appPermissions.browserTag = (/y/i).test(props.browserTagPermission);
    this.appPermissions.audioCapture = (/y/i).test(props.audioCapturePermission);
    this.appPermissions.videoCapture = (/y/i).test(props.videoCapturePermission);
    
    var connections = [];
    if((/y/i).test(props.udpbindPermission)) connections.push("udp-bind::8899");
    if((/y/i).test(props.udpsendPermission)) connections.push("udp-send-to::8899");
    if((/y/i).test(props.tcpPermission)) connections.push("tcp-connect");


    // Complex permission objects
    if((/y/i).test(props.mediagalleryPermission))
      this.appPermissions.mediaGalleries = { "mediaGalleries" : ["read", "all-auto-detected"] };

    if(connections.length > 0)
      this.appPermissions.socket = { 'socket': connections };

    cb();
  }.bind( this ));
};

Generator.prototype.writeFiles = function createManifest() {

  var experimental = {
    "bluetooth" : true,
    "usb": true,
    "identity": true,
    "mediaGalleries": true,
    "browserTag": true
  };


  // Using object to maintain complex objects rather than strings.
  var complex = {
    "socket": true,
    "mediaGalleries": true
  };

  var permissions = [];
  var usesExperimental = false;
  var complexPermissions = [];

  for(var permission in this.appPermissions) {
    if(!!this.appPermissions[permission] == false) continue;
    if(experimental[permission]) usesExperimental = true;
    if(complex[permission])  {
      complexPermissions.push(this.appPermissions[permission]);
      continue;
    }

    permissions.push(permission);
  }

  if(usesExperimental) permissions.push("experimental");
  var data = {
    appFullName: this.appFullName,
    appDescription: this.appDescription,
    appPermissions: "\"" + permissions.join('","') + "\""
  };

  if(complexPermissions.length > 0) {
    for(var p = 0; permission = complexPermissions[p]; p ++) {
      data.appPermissions += "," + JSON.stringify(permission);
    }
  }

  this.directory( '.', '.' );

  this.template( 'app/index.html', path.join( 'app', 'index.html' ), data );
  this.template( 'app/manifest.json', path.join( 'app', 'manifest.json' ), data );
  this.template( 'app/_locales/en/messages.json', path.join( 'app', '_locales', 'en' , 'messages.json' ), data );
};
