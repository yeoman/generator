
var args = process.argv.slice(2);

var output = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', function(chunk){
  output += chunk;
}).on('end', function() {

  var lines = output.split('\n').map(function(l) {
    return l
      .replace('\u001b[32m', '')
      .replace('\u001b[39m', '')
  }).filter(function(l) {
    return /^(create|identical|force)/.test(l);
  }).map(function(l) {
    return l.replace(/^(create|identical|force)/, '');
  });

  var cmd = 'yeoman init mocha:generator ' + args[0];

  console.log(cmd + ' ' + lines.join(' ') + ' --internal');
}).resume();

