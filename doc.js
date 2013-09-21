'use strict';

var fs = require('fs');
var chalk = require('chalk');
var glob = require('glob');
var mkdir = require('mkdirp');
var rm = require('rimraf');
var path = require('path');
var markdox = require('markdox');

// exclude lib/util and lib/test until they're documented
var pattern = 'lib/{*.js,/!(util|test)/*.js}';

glob(pattern, { cwd: __dirname }, function (err, files) {
  files.forEach(function (file) {
    var dest = path.join('doc', path.basename(file, '.js') + '.md');
    var opts = {
      output: path.join(__dirname, dest)
    };

    if (fs.existsSync(path.dirname(opts.output))) {
      rm.sync(path.dirname(opts.output));
    }
    mkdir.sync(path.dirname(opts.output));

    return markdox.process(file, opts, function () {
      console.log(chalk.green('=> ') + dest);
    });
  });
});
