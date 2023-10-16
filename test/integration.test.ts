import path, { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import helpers, { result } from 'yeoman-test';

const _filename = fileURLToPath(import.meta.url);
const _dirname = dirname(_filename);

describe('Integration', () => {
  before(async function () {
    this.timeout(5000);
    await helpers
      .create(path.join(_dirname, 'fixtures/generator-defaults/app'))
      .withAnswers({ foo: 'fooValue' })
      .withOptions({ extra: 'extraValue' })
      .run();
  });
  it('writes prompt value to foo-template.js', () => {
    result.assertFileContent('foo-template.js', "fooValue = 'fooValue");
  });
  it('writes option value foo-template.js', () => {
    result.assertFileContent('foo-template.js', 'extraValue');
  });
});
