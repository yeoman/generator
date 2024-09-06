import path from 'node:path';
import assert from 'node:assert';
import os from 'node:os';
import { rmSync } from 'node:fs';
import { afterEach, beforeEach, describe, it } from 'esmocha';
import { TestAdapter } from '@yeoman/adapter/testing';
import inquirer from 'inquirer';
import Environment from 'yeoman-environment';
import { create as createMemFsEditor } from 'mem-fs-editor';
import Storage from '../src/util/storage.js';
import { prefillQuestions, storeAnswers } from '../src/util/prompt-suggestion.js';

const createEnv = () => new Environment({ skipInstall: true, adapter: new TestAdapter() });
/* eslint max-nested-callbacks: ["warn", 6] */

describe('PromptSuggestion', () => {
  let storePath: string;
  let store: Storage;

  beforeEach(() => {
    const memFs = createEnv().sharedFs;
    const fs = createMemFsEditor(memFs);
    storePath = path.join(os.tmpdir(), 'suggestion-config.json');
    store = new Storage('suggestion', fs, storePath);
    store.set('promptValues', { respuesta: 'foo' });
  });

  afterEach(() => {
    rmSync(storePath, { force: true });
  });

  describe('.prefillQuestions()', () => {
    it('require a store parameter', () => {
      assert.throws(prefillQuestions.bind(null));
    });

    it('require a questions parameter', () => {
      assert.throws(prefillQuestions.bind(store));
    });

    it('take a questions parameter', () => {
      prefillQuestions(store, []);
    });

    it('take a question object', () => {
      const question = {
        name: 'respuesta',
        default: 'bar',
        store: true,
      };
      const [result] = prefillQuestions(store, question);
      assert.equal(result.default, 'foo');
    });

    it('take a question array', () => {
      const question = [
        {
          name: 'respuesta',
          default: 'bar',
          store: true,
        },
      ];
      const [result] = prefillQuestions(store, question);
      assert.equal(result.default, 'foo');
    });

    it("don't override default when store is set to false", () => {
      const question = {
        name: 'respuesta',
        default: 'bar',
        store: false,
      };
      const [result] = prefillQuestions(store, question);
      assert.equal(result.default, 'bar');
    });

    it('override default when store is set to true', () => {
      const question = {
        name: 'respuesta',
        default: 'bar',
        store: true,
      };
      const [result] = prefillQuestions(store, question);
      assert.equal(result.default, 'foo');
    });

    it('keep inquirer objects', () => {
      const question = {
        type: 'checkbox',
        name: 'respuesta',
        default: ['bar'],
        store: true,
        choices: [new inquirer.Separator('spacer')],
      };
      const [result] = prefillQuestions(store, question);
      assert.ok(result.choices[0] instanceof inquirer.Separator);
    });

    describe('take a checkbox', () => {
      beforeEach(() => {
        store.set('promptValues', {
          respuesta: ['foo'],
        });
      });

      it('override default from an array with objects', () => {
        const question = {
          type: 'checkbox',
          name: 'respuesta',
          default: ['bar'],
          store: true,
          choices: [
            {
              value: 'foo',
              name: 'foo',
            },
            new inquirer.Separator('spacer'),
            {
              value: 'bar',
              name: 'bar',
            },
            {
              value: 'baz',
              name: 'baz',
            },
          ],
        };
        const [result] = prefillQuestions(store, question);

        for (const choice of result.choices) {
          assert.equal(choice.checked, false);
        }

        assert.deepEqual(result.default, ['foo']);
      });

      it('override default from an array with strings', () => {
        const question = {
          type: 'checkbox',
          name: 'respuesta',
          default: ['bar'],
          store: true,
          choices: ['foo', new inquirer.Separator('spacer'), 'bar', 'baz'],
        };
        const [result] = prefillQuestions(store, question);
        assert.deepEqual(result.default, ['foo']);
      });

      describe('with multiple defaults', () => {
        beforeEach(() => {
          store.set('promptValues', {
            respuesta: ['foo', 'bar'],
          });
        });

        it('from an array with objects', () => {
          const question = {
            type: 'checkbox',
            name: 'respuesta',
            default: ['bar'],
            store: true,
            choices: [
              {
                value: 'foo',
                name: 'foo',
              },
              new inquirer.Separator('spacer'),
              {
                value: 'bar',
                name: 'bar',
              },
              {
                value: 'baz',
                name: 'baz',
              },
            ],
          };
          const [result] = prefillQuestions(store, question);

          for (const choice of result.choices) {
            assert.equal(choice.checked, false);
          }

          assert.deepEqual(result.default, ['foo', 'bar']);
        });

        it('from an array with strings', () => {
          const question = {
            type: 'checkbox',
            name: 'respuesta',
            default: ['bar'],
            store: true,
            choices: ['foo', new inquirer.Separator('spacer'), 'bar', 'baz'],
          };
          const [result] = prefillQuestions(store, question);
          assert.deepEqual(result.default, ['foo', 'bar']);
        });
      });
    });

    describe('take a checkbox with choices from a function', () => {
      beforeEach(() => {
        store.set('promptValues', {
          respuesta: ['foo'],
        });
      });

      it('does not override default from an array with objects', () => {
        const question = {
          type: 'checkbox',
          name: 'respuesta',
          default: ['bar'],
          store: true,
          choices: () => [
            {
              value: 'foo',
              name: 'foo',
            },
            new inquirer.Separator('spacer'),
            {
              value: 'bar',
              name: 'bar',
            },
            {
              value: 'baz',
              name: 'baz',
            },
          ],
        };
        const [result] = prefillQuestions(store, question);

        assert.deepEqual(result.default, ['bar']);
      });

      it('does not override default from an array with strings', () => {
        const question = {
          type: 'checkbox',
          name: 'respuesta',
          default: ['bar'],
          store: true,
          choices: () => ['foo', new inquirer.Separator('spacer'), 'bar', 'baz'],
        };
        const [result] = prefillQuestions(store, question);
        assert.deepEqual(result.default, ['bar']);
      });

      describe('does not override even with multiple defaults', () => {
        beforeEach(() => {
          store.set('promptValues', {
            respuesta: ['foo', 'bar'],
          });
        });

        it('from an array with objects', () => {
          const question = {
            type: 'checkbox',
            name: 'respuesta',
            default: ['bar'],
            store: true,
            choices: () => [
              {
                value: 'foo',
                name: 'foo',
              },
              new inquirer.Separator('spacer'),
              {
                value: 'bar',
                name: 'bar',
              },
              {
                value: 'baz',
                name: 'baz',
              },
            ],
          };
          const [result] = prefillQuestions(store, question);

          assert.deepEqual(result.default, ['bar']);
        });

        it('from an array with strings', () => {
          const question = {
            type: 'checkbox',
            name: 'respuesta',
            default: ['bar'],
            store: true,
            choices: () => ['foo', new inquirer.Separator('spacer'), 'bar', 'baz'],
          };
          const [result] = prefillQuestions(store, question);
          assert.deepEqual(result.default, ['bar']);
        });
      });
    });

    describe('take a rawlist / expand', () => {
      beforeEach(() => {
        store.set('promptValues', {
          respuesta: 'bar',
        });
      });

      it('override default arrayWithObjects', () => {
        const question = {
          type: 'rawlist',
          name: 'respuesta',
          default: 0,
          store: true,
          choices: [
            {
              value: 'foo',
              name: 'foo',
            },
            new inquirer.Separator('spacer'),
            {
              value: 'bar',
              name: 'bar',
            },
            {
              value: 'baz',
              name: 'baz',
            },
          ],
        };
        const [result] = prefillQuestions(store, question);
        assert.equal(result.default, 2);
      });

      it('override default arrayWithObjects', () => {
        const question = {
          type: 'rawlist',
          name: 'respuesta',
          default: 0,
          store: true,
          choices: ['foo', new inquirer.Separator('spacer'), 'bar', 'baz'],
        };
        const [result] = prefillQuestions(store, question);
        assert.equal(result.default, 2);
      });
    });
  });

  describe('.storeAnswers()', () => {
    beforeEach(() => {
      store.set('promptValues', { respuesta: 'foo' });
    });

    it('require a store parameter', () => {
      assert.throws(storeAnswers.bind(null));
    });

    it('require a question parameter', () => {
      assert.throws(storeAnswers.bind(store));
    });

    it('require a answer parameter', () => {
      assert.throws(storeAnswers.bind(store, []));
    });

    it('take a answer parameter', () => {
      storeAnswers(store, [], {});
    });

    it('take a storeAll parameter', () => {
      storeAnswers(store, [], {}, true);
    });

    it('store answer in global store', () => {
      const question = {
        name: 'respuesta',
        default: 'bar',
        store: true,
      };

      const mockAnswers = {
        respuesta: 'baz',
      };

      prefillQuestions(store, question);
      storeAnswers(store, question, mockAnswers);
      assert.equal(store.get('promptValues').respuesta, 'baz');
    });

    it("don't store default answer in global store", () => {
      const question = {
        name: 'respuesta',
        default: 'bar',
        store: true,
      };

      const mockAnswers = {
        respuesta: 'bar',
      };

      store.delete('promptValues');
      prefillQuestions(store, question);
      storeAnswers(store, question, mockAnswers, false);
      assert.equal(store.get('promptValues'), undefined);
    });

    it('force store default answer in global store', () => {
      const question = {
        name: 'respuesta',
        default: 'bar',
        store: true,
      };

      const mockAnswers = {
        respuesta: 'bar',
      };

      store.delete('promptValues');
      prefillQuestions(store, question);
      storeAnswers(store, question, mockAnswers, true);
      assert.equal(store.get('promptValues').respuesta, 'bar');
    });

    it("don't store answer in global store", () => {
      const question = {
        name: 'respuesta',
        default: 'bar',
        store: false,
      };

      const mockAnswers = {
        respuesta: 'baz',
      };

      prefillQuestions(store, question);
      storeAnswers(store, question, mockAnswers);
      assert.equal(store.get('promptValues').respuesta, 'foo');
    });

    it('store answer from rawlist type', () => {
      const question = {
        type: 'rawlist',
        name: 'respuesta',
        default: 0,
        store: true,
        choices: ['foo', new inquirer.Separator('spacer'), 'bar', 'baz'],
      };

      const mockAnswers = {
        respuesta: 'baz',
      };

      prefillQuestions(store, question);
      storeAnswers(store, question, mockAnswers);
      assert.equal(store.get('promptValues').respuesta, 'baz');
    });

    describe('empty store', () => {
      beforeEach(() => {
        store.delete('promptValues');
      });
      it("don't store default answer from rawlist type", () => {
        const question = {
          type: 'rawlist',
          name: 'respuesta',
          default: 0,
          store: true,
          choices: ['foo', new inquirer.Separator('spacer'), 'bar', 'baz'],
        };

        const mockAnswers = {
          respuesta: 'foo',
        };

        prefillQuestions(store, question);
        storeAnswers(store, question, mockAnswers, false);
        assert.equal(store.get('promptValues'), undefined);
      });

      it('force store default answer from rawlist type', () => {
        const question = {
          type: 'rawlist',
          name: 'respuesta',
          default: 0,
          store: true,
          choices: ['foo', new inquirer.Separator('spacer'), 'bar', 'baz'],
        };

        const mockAnswers = {
          respuesta: 'foo',
        };

        prefillQuestions(store, question);
        storeAnswers(store, question, mockAnswers, true);
        assert.equal(store.get('promptValues').respuesta, 'foo');
      });
    });

    it('store falsy answer (but not undefined) in global store', () => {
      const question = {
        name: 'respuesta',
        default: true,
        store: true,
      };

      const mockAnswers = {
        respuesta: false,
      };

      prefillQuestions(store, question);
      storeAnswers(store, question, mockAnswers);
      assert.equal(store.get('promptValues').respuesta, false);
    });
  });
});
