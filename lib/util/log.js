var events = require('events');
var grunt  = require('grunt');
var _      = grunt.util._;

// padding step
var step    = '  ';
var padding = '';

// color -> status mappings
var colors = {
  skip      : 'yellow',
  force     : 'yellow',
  create    : 'green',
  invoke    : 'bold',
  conflict  : 'red',
  identical : 'cyan'
};

// Log API
// -------
// as self.log property. 1:1 relationship with grunt.log
module.exports = function logger() {
  function log (msg, ctx) {
    if (!msg) throw new Error('msg is a required argument.');
    if (!ctx) ctx = {};
    console.log(formatter(msg, ctx));
  }

  _.extend(log, events.EventEmitter.prototype);
  _.extend(log, grunt.log);

  log.on('up', function() {
    padding = padding + step;
  });

  log.on('down', function() {
    padding = padding.replace(step, '');
  });

  Object.keys(colors).forEach(function(status) {
    log[status] = function() {
      var color = colors[status];
      this.write(pad(status)[color]).write(padding);
      console.log.apply(console, arguments);
    };
  });

  return log;
};

function pad(status) {
  var max = 'identical'.length;
  var delta = max - status.length;
  return delta ? new Array(delta + 1).join(' ') + status : status;
}

// borrowed to https://github.com/mikeal/logref/blob/master/main.js#L6-15
function formatter (msg, ctx) {
  while (msg.indexOf('%') !== -1) {
    var start = msg.indexOf('%'),
      end = msg.indexOf(' ', start);

    if (end === -1) end = msg.length;
    msg = msg.slice(0, start) + ctx[msg.slice(start+1, end)] + msg.slice(end);
  }
  return msg;
}
