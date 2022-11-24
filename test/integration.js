import fs from 'fs';
import path, {dirname} from 'path';
import assert from 'yeoman-assert';
import Environment from 'yeoman-environment';
import helpers from 'yeoman-test';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Integration', () => {
  let content;
  before(function () {
    this.timeout(5000);
    let temporaryDir;
    return helpers
      .create(
        path.join(__dirname, 'fixtures/generator-defaults/app'),
        {},
        {createEnv: Environment.createEnv}
      )
      .inTmpDir(() => {
        temporaryDir = process.cwd();
      })
      .withPrompts({foo: 'fooValue'})
      .withOptions({extra: 'extraValue'})
      .build()
      .run()
      .then(() => {
        const file = path.join(temporaryDir, 'foo-template.js');
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
