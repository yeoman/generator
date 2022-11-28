import fs from 'node:fs';
import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import assert from 'yeoman-assert';
import Environment from 'yeoman-environment';
import helpers from 'yeoman-test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

describe('Integration', () => {
  let content;
  before(async function () {
    this.timeout(5000);
    let temporaryDir;
    await helpers
      .create(
        path.join(__dirname, 'fixtures/generator-defaults/app'),
        {},
        { createEnv: Environment.createEnv },
      )
      .inTmpDir(() => {
        temporaryDir = process.cwd();
      })
      .withPrompts({ foo: 'fooValue' })
      .withOptions({ extra: 'extraValue' })
      .run();
    const file = path.join(temporaryDir, 'foo-template.js');
    content = fs.readFileSync(path.resolve(file)).toString();
  });
  it('writes prompt value to foo-template.js', () => {
    assert(content.includes("fooValue = 'fooValue"));
  });
  it('writes option value foo-template.js', () => {
    assert(content.includes('extraValue'));
  });
});
