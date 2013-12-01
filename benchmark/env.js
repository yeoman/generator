var generators = require('..');
var Benchmark = require('benchmark');
var chalk = require('chalk');
var table = require('text-table');

var suite = new Benchmark.Suite();

suite
  .add('Env#lookup', function () {
    generators().lookup();
  });

suite.on('complete', function (e) {
  var tests = e.currentTarget;
  var nbr = tests.length
  var t = [
    [ 'test', 'ops/sec' ]
  ];
  while( nbr-- ) {
    t.push([ tests[nbr].name, tests[nbr].hz ]);
  }
  console.log(table(t));
});

suite.run({ async: true });
