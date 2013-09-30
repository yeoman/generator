var fs = require('fs');
var path = require('path');
var download = require('download');
var chalk = require('chalk');

var fetch = module.exports;

var proxy = process.env.http_proxy || process.env.HTTP_PROXY ||
    process.env.https_proxy || process.env.HTTPS_PROXY || '';

/**
 * Download a single file to a given destination.
 *
 * @param {String} url
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
 * Fetch an archive and extract it to a given destination.
 *
 * @param {String} archive
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
