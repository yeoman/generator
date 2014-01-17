'use strict';
var path = require('path');
var fs = require('fs');

/**
 * @mixin
 * @alias actions/help
 */
var help = module.exports;

/**
 * Generate the default banner for help output, adjusting output to
 * argument type.
 *
 * Options:
 *
 *   - `name` Uppercased value to display (only relevant with `String` type)
 *   - `type` String, Number, Object or Array
 *
 * @param {Object} config
 */

help.bannerFor = function bannerFor(config) {
  return config.type === Boolean ? '' :
    config.type === String ? config.name.toUpperCase() :
    config.type === Number ? 'N' :
    config.type === Object ? 'key:value' :
    config.type === Array ? 'one two three' :
    '';
};

/**
 * Tries to get the description from a USAGE file one folder above the
 * source root otherwise uses a default description.
 */

help.help = function help() {
  var filepath = path.join(this.sourceRoot(), '../USAGE');
  var exists = fs.existsSync(filepath);

  var out = [
    'Usage:',
    '  ' + this.usage(),
    ''
  ];

  // build options
  if (this._options.length) {
    out = out.concat([
      'Options:',
      this.optionsHelp(),
      ''
    ]);
  }

  // build arguments
  if (this._arguments.length) {
    out = out.concat([
      'Arguments:',
      this.argumentsHelp(),
      ''
    ]);
  }

  // append USAGE file is any
  if (exists) {
    out.push(fs.readFileSync(filepath, 'utf8'));
  }

  return out.join('\n');
};

/**
 * Output usage information for this given generator, depending on its arguments,
 * options or hooks.
 */

help.usage = function usage() {
  var options = this._options.length ? '[options]' : '';
  var name = ' ' + this.options.namespace;
  var args = '';

  if (this._arguments.length) {
    args = this._arguments.map(formatArg).join(' ');
  }

  name = name.replace(/^yeoman:/, '');

  var out = 'yo' + name + ' ' + options + ' ' + args;

  if (this.description) {
    out += '\n\n' + this.description;
  }

  return out;
};

function formatArg(argItem) {
  var arg = '<' + argItem.name + '>';

  if (!argItem.config.required) {
    arg = '[' + arg + ']';
  }

  return arg;
}

/**
 * Simple setter for custom `description` to append on help output.
 *
 * @param {String} description
 */

help.desc = function desc(description) {
  this.description = description || '';
  return this;
};

help.argumentsHelp = function argumentsHelp() {
  var rows = this._arguments.map(function (a) {
    return [
      '',
      a.name ? a.name : '',
      a.config.type ? '# Type: ' + a.config.type.name : '',
      'Required: ' + a.config.required
    ];
  });

  return this.log.table({
    rows: rows
  });
};

/**
 * Returns the list of options in formatted table.
 */

help.optionsHelp = function optionsHelp() {
  var options = this._options.filter(function (el) {
    return !el.hide;
  });

  var hookOpts = this._hooks.map(function (hook) {
    return hook.generator && hook.generator._options;
  }).reduce(function (a, b) {
    a = a.concat(b);
    return a;
  }, []).filter(function (opts) {
    return opts && opts.name !== 'help';
  });

  var rows = options.concat(hookOpts).map(function (o) {
    return [
      '',
      o.alias ? '-' + o.alias + ', ' : '',
      '--' + o.name,
      o.desc ? '# ' + o.desc : '',
      o.defaults == null ? '' : 'Default: ' + o.defaults
    ];
  });

  return this.log.table({
    rows: rows
  });
};
