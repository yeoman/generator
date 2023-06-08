import path from 'node:path';
import assert from 'node:assert';
import os from 'node:os';
import { rmSync } from 'node:fs';
// eslint-disable-next-line n/file-extension-in-import
import { TestAdapter } from '@yeoman/adapter/testing';
import inquirer from 'inquirer';
import Environment from 'yeoman-environment';
import { create as createMemFsEditor } from 'mem-fs-editor';
import Storage from '../src/util/storage.js';
import { prefillQuestions, storeAnswers } from '../src/util/prompt-suggestion.js';

const createEnv = () => new Environment({ skipInstall: true, adapter: new TestAdapter() });
/* eslint max-nested-callbacks: ["warn", 6] */

describe('PromptSuggestion', () => {
  beforeEach(function () {
    this.memFs = createEnv().sharedFs;
    this.fs = createMemFsEditor(this.memFs);
    this.storePath = path.join(os.tmpdir(), 'suggestion-config.json');
    this.store = new Storage('suggestion', this.fs, this.storePath);
    this.store.set('promptValues', { respuesta: 'foo' });
  });

  afterEach(function () {
    rmSync(this.storePath, { force: true });
  });

  describe('.prefillQuestions()', () => {
    it('require a store parameter', () => {
      assert.throws(prefillQuestions.bind(null));
    });

    it('require a questions parameter', function () {
      assert.throws(prefillQuestions.bind(this.store));
    });

    it('take a questions parameter', function () {
      prefillQuestions(this.store, []);
    });

    it('take a question object', function () {
      const question = {
        name: 'respuesta',
        default: 'bar',
        store: true,
      };
      const result = prefillQuestions(this.store, question)[0];
      assert.equal(result.default, 'foo');
    });

    it('take a question array', function () {
      const question = [
        {
          name: 'respuesta',
          default: 'bar',
          store: true,
        },
      ];
      const result = prefillQuestions(this.store, question)[0];
      assert.equal(result.default, 'foo');
    });

    it("don't override default when store is set to false", function () {
      const question = {
        name: 'respuesta',
        default: 'bar',
        store: false,
      };
      const result = prefillQuestions(this.store, question)[0];
      assert.equal(result.default, 'bar');
    });

    it('override default when store is set to true', function () {
      const question = {
        name: 'respuesta',
        default: 'bar',
        store: true,
      };
      const result = prefillQuestions(this.store, question)[0];
      assert.equal(result.default, 'foo');
    });

    it('keep inquirer objects', function () {
      const question = {
        type: 'checkbox',
        name: 'respuesta',
        default: ['bar'],
        store: true,
        choices: [new inquirer.Separator('spacer')],
      };
      const result = prefillQuestions(this.store, question)[0];
      assert.ok(result.choices[0] instanceof inquirer.Separator);
    });

    describe('take a checkbox', () => {
      beforeEach(function () {
        this.store.set('promptValues', {
          respuesta: ['foo'],
        });
      });

      it('override default from an array with objects', function () {
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
        const result = prefillQuestions(this.store, question)[0];

        for (const choice of result.choices) {
          assert.equal(choice.checked, false);
        }

        assert.deepEqual(result.default, ['foo']);
      });

      it('override default from an array with strings', function () {
        const question = {
          type: 'checkbox',
          name: 'respuesta',
          default: ['bar'],
          store: true,
          choices: ['foo', new inquirer.Separator('spacer'), 'bar', 'baz'],
        };
        const result = prefillQuestions(this.store, question)[0];
        assert.deepEqual(result.default, ['foo']);
      });

      describe('with multiple defaults', () => {
        beforeEach(function () {
          this.store.set('promptValues', {
            respuesta: ['foo', 'bar'],
          });
        });

        it('from an array with objects', function () {
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
          const result = prefillQuestions(this.store, question)[0];

          for (const choice of result.choices) {
            assert.equal(choice.checked, false);
          }

          assert.deepEqual(result.default, ['foo', 'bar']);
        });

        it('from an array with strings', function () {
          const question = {
            type: 'checkbox',
            name: 'respuesta',
            default: ['bar'],
            store: true,
            choices: ['foo', new inquirer.Separator('spacer'), 'bar', 'baz'],
          };
          const result = prefillQuestions(this.store, question)[0];
          assert.deepEqual(result.default, ['foo', 'bar']);
        });
      });
    });

    describe('take a checkbox with choices from a function', () => {
      beforeEach(function () {
        this.store.set('promptValues', {
          respuesta: ['foo'],
        });
      });

      it('does not override default from an array with objects', function () {
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
        const result = prefillQuestions(this.store, question)[0];

        assert.deepEqual(result.default, ['bar']);
      });

      it('does not override default from an array with strings', function () {
        const question = {
          type: 'checkbox',
          name: 'respuesta',
          default: ['bar'],
          store: true,
          choices: () => ['foo', new inquirer.Separator('spacer'), 'bar', 'baz'],
        };
        const result = prefillQuestions(this.store, question)[0];
        assert.deepEqual(result.default, ['bar']);
      });

      describe('does not override even with multiple defaults', () => {
        beforeEach(function () {
          this.store.set('promptValues', {
            respuesta: ['foo', 'bar'],
          });
        });

        it('from an array with objects', function () {
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
          const result = prefillQuestions(this.store, question)[0];

          assert.deepEqual(result.default, ['bar']);
        });

        it('from an array with strings', function () {
          const question = {
            type: 'checkbox',
            name: 'respuesta',
            default: ['bar'],
            store: true,
            choices: () => ['foo', new inquirer.Separator('spacer'), 'bar', 'baz'],
          };
          const result = prefillQuestions(this.store, question)[0];
          assert.deepEqual(result.default, ['bar']);
        });
      });
    });

    describe('take a rawlist / expand', () => {
      beforeEach(function () {
        this.store.set('promptValues', {
          respuesta: 'bar',
        });
      });

      it('override default arrayWithObjects', function () {
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
        const result = prefillQuestions(this.store, question)[0];
        assert.equal(result.default, 2);
      });

      it('override default arrayWithObjects', function () {
        const question = {
          type: 'rawlist',
          name: 'respuesta',
          default: 0,
          store: true,
          choices: ['foo', new inquirer.Separator('spacer'), 'bar', 'baz'],
        };
        const result = prefillQuestions(this.store, question)[0];
        assert.equal(result.default, 2);
      });
    });
  });

  describe('.storeAnswers()', () => {
    beforeEach(function () {
      this.store.set('promptValues', { respuesta: 'foo' });
    });

    it('require a store parameter', () => {
      assert.throws(storeAnswers.bind(null));
    });

    it('require a question parameter', function () {
      assert.throws(storeAnswers.bind(this.store));
    });

    it('require a answer parameter', function () {
      assert.throws(storeAnswers.bind(this.store, []));
    });

    it('take a answer parameter', function () {
      storeAnswers(this.store, [], {});
    });

    it('take a storeAll parameter', function () {
      storeAnswers(this.store, [], {}, true);
    });

    it('store answer in global store', function () {
      const question = {
        name: 'respuesta',
        default: 'bar',
        store: true,
      };

      const mockAnswers = {
        respuesta: 'baz',
      };

      prefillQuestions(this.store, question);
      storeAnswers(this.store, question, mockAnswers);
      assert.equal(this.store.get('promptValues').respuesta, 'baz');
    });

    it("don't store default answer in global store", function () {
      const question = {
        name: 'respuesta',
        default: 'bar',
        store: true,
      };

      const mockAnswers = {
        respuesta: 'bar',
      };

      this.store.delete('promptValues');
      prefillQuestions(this.store, question);
      storeAnswers(this.store, question, mockAnswers, false);
      assert.equal(this.store.get('promptValues'), undefined);
    });

    it('force store default answer in global store', function () {
      const question = {
        name: 'respuesta',
        default: 'bar',
        store: true,
      };

      const mockAnswers = {
        respuesta: 'bar',
      };

      this.store.delete('promptValues');
      prefillQuestions(this.store, question);
      storeAnswers(this.store, question, mockAnswers, true);
      assert.equal(this.store.get('promptValues').respuesta, 'bar');
    });

    it("don't store answer in global store", function () {
      const question = {
        name: 'respuesta',
        default: 'bar',
        store: false,
      };

      const mockAnswers = {
        respuesta: 'baz',
      };

      prefillQuestions(this.store, question);
      storeAnswers(this.store, question, mockAnswers);
      assert.equal(this.store.get('promptValues').respuesta, 'foo');
    });

    it('store answer from rawlist type', function () {
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

      prefillQuestions(this.store, question);
      storeAnswers(this.store, question, mockAnswers);
      assert.equal(this.store.get('promptValues').respuesta, 'baz');
    });

    describe('empty store', () => {
      beforeEach(function () {
        this.store.delete('promptValues');
      });
      it("don't store default answer from rawlist type", function () {
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

        prefillQuestions(this.store, question);
        storeAnswers(this.store, question, mockAnswers, false);
        assert.equal(this.store.get('promptValues'), undefined);
      });

      it('force store default answer from rawlist type', function () {
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

        prefillQuestions(this.store, question);
        storeAnswers(this.store, question, mockAnswers, true);
        assert.equal(this.store.get('promptValues').respuesta, 'foo');
      });
    });

    it('store falsy answer (but not undefined) in global store', function () {
      const question = {
        name: 'respuesta',
        default: true,
        store: true,
      };

      const mockAnswers = {
        respuesta: false,
      };

      prefillQuestions(this.store, question);
      storeAnswers(this.store, question, mockAnswers);
      assert.equal(this.store.get('promptValues').respuesta, false);
    });
  });
});
