'use strict';
var fs = require('fs');
var path = require('path');
var request = require('request');
var download = require('download');
var chalk = require('chalk');

var proxy = process.env.http_proxy || process.env.HTTP_PROXY ||
    process.env.https_proxy || process.env.HTTPS_PROXY || '';

/**
 * @mixin
 * @alias actions/fetch
 */
var fetch = module.exports;

/**
 * Download a string or an array of files to a given destination.
 *
 * @param {String|Array} url
 * @param {String} destination
 * @param {Function} cb
 */

fetch.fetch = function _fetch(url, destination, cb) {
  var dl = download(url, destination, { proxy: proxy });
  var log = this.log('... Fetching %s ...', url);

  return dl
    .on('data', function () {
      log.write('.');
    })
    .on('error', cb)
    .once('close', function () {
      log.ok('Done in ' + destination).write();
      cb();
    });
};

/**
 * Fetch a string or an array of archives and extract it/them to a given
 * destination.
 *
 * @param {String|Array} archive
 * @param {String} destination
 * @param {Function} cb
 */

fetch.extract = function _extract(archive, destination, cb) {
  var opts = {
    extract: true,
    proxy: proxy,
    strip: 1
  };

  var dl = download(archive, destination, opts);
  var log = this.log.write()
    .info('... Fetching %s ...', archive)
    .info(chalk.yellow('This might take a few moments'));

  return dl
    .on('data', function () {
      log.write('.');
    })
    .on('error', cb)
    .once('close', function () {
      log.ok('Done in ' + destination).write();
      cb();
    });
};

fetch.tarball = fetch.extract;

/**
 * Expose the request module set up with a proxy
 */

fetch.request = request.defaults({ proxy: proxy });
