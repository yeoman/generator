import path from 'node:path';
import assert from 'node:assert';
import os from 'node:os';
import { rmSync } from 'node:fs';
import { afterEach, beforeEach, describe, it } from 'vitest';
import { TestAdapter } from '@yeoman/adapter/testing';
import { TerminalAdapter } from '@yeoman/adapter';
import Environment from 'yeoman-environment';
import { create as createMemFsEditor } from 'mem-fs-editor';
import Storage from '../src/util/storage.js';
import { prefillQuestions, storeAnswers } from '../src/util/prompt-suggestion.js';

const createEnv = () => new Environment({ skipInstall: true, adapter: new TestAdapter() });
/* eslint max-nested-callbacks: ["warn", 6] */

const adapter = new TerminalAdapter();

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
      // @ts-expect-error - testing missing parameter
      assert.throws(prefillQuestions.bind(null));
    });

    it('require a questions parameter', () => {
      // @ts-expect-error - testing missing parameter
      assert.throws(prefillQuestions.bind(store));
    });

    it('take a questions parameter', () => {
      prefillQuestions(store, []);
    });

    it('take a question object', () => {
      const question = {
        name: 'respuesta',
        type: 'input',
        message: 'Respuesta',
        default: 'bar',
        store: true,
      } as const;
      const [result] = prefillQuestions(store, question);
      assert.equal(result.default, 'foo');
    });

    it('take a question array', () => {
      const [result] = prefillQuestions(store, [
        {
          name: 'respuesta',
          type: 'input',
          message: 'Respuesta',
          default: 'bar',
          store: true,
        },
      ]);
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
      const [result] = prefillQuestions(store, {
        name: 'respuesta',
        type: 'input',
        default: 'bar',
        message: 'Respuesta',
        store: true,
      });
      assert.equal(result.default, 'foo');
    });

    it('keep inquirer objects', () => {
      const separator = adapter.separator('spacer');
      const [result] = prefillQuestions(store, {
        type: 'checkbox',
        name: 'respuesta',
        message: 'Respuesta',
        default: ['bar'],
        store: true,
        choices: [separator],
      });
      assert.equal(result.choices[0], separator);
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
            adapter.separator('spacer'),
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
        const [result] = prefillQuestions(store, {
          type: 'checkbox',
          name: 'respuesta',
          message: 'Respuesta',
          default: ['bar'],
          store: true,
          choices: ['foo', adapter.separator('spacer'), 'bar', 'baz'],
        });
        assert.deepEqual(result.default, ['foo']);
      });

      describe('with multiple defaults', () => {
        beforeEach(() => {
          store.set('promptValues', {
            respuesta: ['foo', 'bar'],
          });
        });

        it('from an array with objects', () => {
          const [result] = prefillQuestions(store, {
            type: 'checkbox',
            name: 'respuesta',
            message: 'Respuesta',
            default: ['bar'],
            store: true,
            choices: [
              {
                value: 'foo',
                name: 'foo',
              },
              adapter.separator('spacer'),
              {
                value: 'bar',
                name: 'bar',
              },
              {
                value: 'baz',
                name: 'baz',
              },
            ],
          });

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
            choices: ['foo', adapter.separator('spacer'), 'bar', 'baz'],
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
            adapter.separator('spacer'),
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
          choices: () => ['foo', adapter.separator('spacer'), 'bar', 'baz'],
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
              adapter.separator('spacer'),
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
            choices: () => ['foo', adapter.separator('spacer'), 'bar', 'baz'],
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
            adapter.separator('spacer'),
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
          choices: ['foo', adapter.separator('spacer'), 'bar', 'baz'],
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
        choices: ['foo', adapter.separator('spacer'), 'bar', 'baz'],
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
          choices: ['foo', adapter.separator('spacer'), 'bar', 'baz'],
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
          choices: ['foo', adapter.separator('spacer'), 'bar', 'baz'],
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
