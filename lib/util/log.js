'use strict';
var util = require('util');
var events = require('events');
var _ = require('lodash');
var table = require('text-table');
var chalk = require('chalk');

// padding step
var step    = '  ';
var padding = ' ';

// color -> status mappings
var colors = {
  skip: 'yellow',
  force: 'yellow',
  create: 'green',
  invoke: 'bold',
  conflict: 'red',
  identical: 'cyan',
  info: 'gray'
};

function pad(status) {
  var max = 'identical'.length;
  var delta = max - status.length;
  return delta ? new Array(delta + 1).join(' ') + status : status;
}

// borrowed from https://github.com/mikeal/logref/blob/master/main.js#L6-15
function formatter(msg, ctx) {
  while (msg.indexOf('%') !== -1) {
    var start = msg.indexOf('%');
    var end = msg.indexOf(' ', start);

    if (end === -1) {
      end = msg.length;
    }

    msg = msg.slice(0, start) + ctx[msg.slice(start + 1, end)] + msg.slice(end);
  }
  return msg;
}

module.exports = function logger() {
  // `this.log` is a [logref](https://github.com/mikeal/logref)
  // compatible logger, with an enhanced API.
  //
  // It also has EventEmitter like capabilities, so you can call on / emit
  // on it, namely used to increase or decrease the padding.
  //
  // All logs are done against STDERR, letting you stdout for meaningfull
  // value and redirection, should you need to generate output this way.
  //
  // Log functions take two arguments, a message and a context. For any
  // other kind of paramters, `console.error` is used, so all of the
  // console format string goodies you're used to work fine.
  //
  // - msg      - The message to show up
  // - context  - The optional context to escape the message against
  //
  // Retunrns the logger
  function log(msg, ctx) {
    msg = msg || '';

    if (typeof ctx === 'object' && !Array.isArray(ctx)) {
      console.error(formatter(msg, ctx));
    } else {
      console.error.apply(console, arguments);
    }

    return log;
  }

  _.extend(log, events.EventEmitter.prototype);

  // A simple write method, with formatted message. If `msg` is
  // ommitted, then a single `\n` is written.
  //
  // Returns the logger
  log.write = function (msg) {
    if (!msg) {
      return this.write('\n');
    }

    process.stderr.write(util.format.apply(util, arguments));
    return this;
  };

  // Same as `log.write()` but automatically appends a `\n` at the end
  // of the message.
  log.writeln = function () {
    return this.write.apply(this, arguments).write();
  };

  // Convenience helper to write sucess status, this simply prepends the
  // message with a gren `✔`.
  log.ok = function () {
    this.write(chalk.green('✔ ') + util.format.apply(util, arguments) + '\n');
    return this;
  };

  log.error = function () {
    this.write(chalk.red('✗ ') + util.format.apply(util, arguments) + '\n');
    return this;
  };

  log.on('up', function () {
    padding = padding + step;
  });

  log.on('down', function () {
    padding = padding.replace(step, '');
  });

  Object.keys(colors).forEach(function (status) {
    // Each predefined status has its logging method utility, handling
    // status color and padding before the usual `.write()`
    //
    // Example
    //
    //    this.log
    //      .write()
    //      .info('Doing something')
    //      .force('Forcing filepath %s, 'some path')
    //      .conflict('on %s' 'model.js')
    //      .write()
    //      .ok('This is ok');
    //
    // The list of status and mapping colors
    //
    //    skip       yellow
    //    force      yellow
    //    create     green
    //    invoke     bold
    //    conflict   red
    //    identical  cyan
    //    info       grey
    //
    // Returns the logger
    log[status] = function () {
      var color = colors[status];
      this.write(chalk[color](pad(status))).write(padding);
      this.write(util.format.apply(util, arguments) + '\n');
      return this;
    };
  });

  // A basic wrapper around `cli-table` package, resetting any single
  // char to empty strings, this is used for aligning options and
  // arguments without too much Math on our side.
  //
  // - opts - A list of rows or an Hash of options to pass through cli
  //          table.
  //
  // Returns the table reprensetation
  log.table = function (opts) {
    var tableData = [];

    opts = Array.isArray(opts) ? { rows: opts } : opts;
    opts.rows = opts.rows || [];

    opts.rows.forEach(function (row) {
      tableData.push(row);
    });

    return table(tableData);
  };

  return log;
};
