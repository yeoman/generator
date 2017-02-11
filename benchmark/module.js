/* global suite, bench */
'use strict';

suite('yeoman-generator module', function () {
  bench('require', function () {
    require('..'); // eslint-disable-line import/no-unassigned-import
    delete require.cache[require.resolve('..')];
  });
});
