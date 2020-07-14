'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('yeoman-assert');
const Environment = require('yeoman-environment');
const helpers = require('yeoman-test');

describe('Integration', () => {
  let content;
  before(function() {
    this.timeout(5000);
    let tmpDir;
    return helpers
      .create(
        path.join(__dirname, 'fixtures/generator-defaults/app'),
        {},
        { createEnv: Environment.createEnv }
      )
      .inTmpDir(() => {
        tmpDir = process.cwd();
      })
      .withPrompts({ foo: 'fooValue' })
      .withOptions({ extra: 'extraValue' })
      .build()
      .run()
      .then(() => {
        const file = path.join(tmpDir, 'foo-template.js');
        content = fs.readFileSync(path.resolve(file)).toString();
      });
  });
  it('writes prompt value to foo-template.js', () => {
    assert(content.includes("fooValue = 'fooValue"));
  });
  it('writes option value foo-template.js', () => {
    assert(content.includes('extraValue'));
  });
});
