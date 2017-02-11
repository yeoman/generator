/* global suite, bench */
'use strict';

suite('yeoman-generator module', () => {
  bench('require', () => {
    require('..'); // eslint-disable-line import/no-unassigned-import
    delete require.cache[require.resolve('..')];
  });
});
