#!/usr/bin/env node
var args = process.argv.slice(2);
var output = '';

process.stdin.setEncoding('utf8');
process.stdin.on('data', function (chunk) {
  output += chunk;
}).on('end', function () {
  var lines = output.split('\n').map(function (l) {
    return l.replace(/\u001b\[\d{2}m/g, '').replace('\u001b', '');
  }).filter(function (l, i) {
    return (/^\s*(create|identical|force)/).test(l);
  }).map(function (l) {
    return l.replace(/^\s*(create|identical|force)/, '').trim();
  });

  var cmd = 'yeoman init mocha:generator ' + args[0];
  console.log(cmd + ' ' + lines.join(' ') + ' --internal');
}).resume();
