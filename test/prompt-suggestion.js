'use strict';
const path = require('path');
const assert = require('assert');
const os = require('os');
const rimraf = require('rimraf');
const inquirer = require('inquirer');
const env = require('yeoman-environment');
const FileEditor = require('mem-fs-editor');
const Storage = require('../lib/util/storage');
const promptSuggestion = require('../lib/util/prompt-suggestion');

describe('PromptSuggestion', () => {
  beforeEach(function () {
    this.memFs = env.createEnv().sharedFs;
    this.fs = FileEditor.create(this.memFs);
    this.storePath = path.join(os.tmpdir(), 'suggestion-config.json');
    this.store = new Storage('suggestion', this.fs, this.storePath);
    this.store.set('promptValues', {respuesta: 'foo'});
  });

  afterEach(function (done) {
    rimraf(this.storePath, done);
  });

  describe('.prefillQuestions()', () => {
    it('require a store parameter', () => {
      assert.throws(promptSuggestion.prefillQuestions.bind(null));
    });

    it('require a questions parameter', function () {
      assert.throws(promptSuggestion.prefillQuestions.bind(this.store));
    });

    it('take a questions parameter', function () {
      promptSuggestion.prefillQuestions(this.store, []);
    });

    it('take a question object', function () {
      const question = {
        name: 'respuesta',
        default: 'bar',
        store: true
      };
      const result = promptSuggestion.prefillQuestions(this.store, question)[0];
      assert.equal(result.default, 'foo');
    });

    it('take a question array', function () {
      const question = [{
        name: 'respuesta',
        default: 'bar',
        store: true
      }];
      const result = promptSuggestion.prefillQuestions(this.store, question)[0];
      assert.equal(result.default, 'foo');
    });

    it('don\'t override default when store is set to false', function () {
      const question = {
        name: 'respuesta',
        default: 'bar',
        store: false
      };
      const result = promptSuggestion.prefillQuestions(this.store, question)[0];
      assert.equal(result.default, 'bar');
    });

    it('override default when store is set to true', function () {
      const question = {
        name: 'respuesta',
        default: 'bar',
        store: true
      };
      const result = promptSuggestion.prefillQuestions(this.store, question)[0];
      assert.equal(result.default, 'foo');
    });

    it('keep inquirer objects', function () {
      const question = {
        type: 'checkbox',
        name: 'respuesta',
        default: ['bar'],
        store: true,
        choices: [new inquirer.Separator('spacer')]
      };
      const result = promptSuggestion.prefillQuestions(this.store, question)[0];
      assert.ok(result.choices[0] instanceof inquirer.Separator);
    });

    describe('take a checkbox', () => {
      beforeEach(function () {
        this.store.set('promptValues', {
          respuesta: ['foo']
        });
      });

      it('override default from an array with objects', function () {
        const question = {
          type: 'checkbox',
          name: 'respuesta',
          default: ['bar'],
          store: true,
          choices: [{
            value: 'foo',
            name: 'foo'
          }, new inquirer.Separator('spacer'), {
            value: 'bar',
            name: 'bar'
          }, {
            value: 'baz',
            name: 'baz'
          }]
        };
        const result = promptSuggestion.prefillQuestions(this.store, question)[0];

        result.choices.forEach(choice => {
          assert.equal(choice.checked, false);
        });

        assert.deepEqual(result.default, ['foo']);
      });

      it('override default from an array with strings', function () {
        const question = {
          type: 'checkbox',
          name: 'respuesta',
          default: ['bar'],
          store: true,
          choices: ['foo', new inquirer.Separator('spacer'), 'bar', 'baz']
        };
        const result = promptSuggestion.prefillQuestions(this.store, question)[0];
        assert.deepEqual(result.default, ['foo']);
      });

      describe('with multiple defaults', () => {
        beforeEach(function () {
          this.store.set('promptValues', {
            respuesta: ['foo', 'bar']
          });
        });

        it('from an array with objects', function () {
          const question = {
            type: 'checkbox',
            name: 'respuesta',
            default: ['bar'],
            store: true,
            choices: [{
              value: 'foo',
              name: 'foo'
            }, new inquirer.Separator('spacer'), {
              value: 'bar',
              name: 'bar'
            }, {
              value: 'baz',
              name: 'baz'
            }]
          };
          const result = promptSuggestion.prefillQuestions(this.store, question)[0];

          result.choices.forEach(choice => {
            assert.equal(choice.checked, false);
          });

          assert.deepEqual(result.default, ['foo', 'bar']);
        });

        it('from an array with strings', function () {
          const question = {
            type: 'checkbox',
            name: 'respuesta',
            default: ['bar'],
            store: true,
            choices: ['foo', new inquirer.Separator('spacer'), 'bar', 'baz']
          };
          const result = promptSuggestion.prefillQuestions(this.store, question)[0];
          assert.deepEqual(result.default, ['foo', 'bar']);
        });
      });
    });

    describe('take a rawlist / expand', () => {
      beforeEach(function () {
        this.store.set('promptValues', {
          respuesta: 'bar'
        });
      });

      it('override default arrayWithObjects', function () {
        const question = {
          type: 'rawlist',
          name: 'respuesta',
          default: 0,
          store: true,
          choices: [{
            value: 'foo',
            name: 'foo'
          }, new inquirer.Separator('spacer'), {
            value: 'bar',
            name: 'bar'
          }, {
            value: 'baz',
            name: 'baz'
          }]
        };
        const result = promptSuggestion.prefillQuestions(this.store, question)[0];
        assert.equal(result.default, 2);
      });

      it('override default arrayWithObjects', function () {
        const question = {
          type: 'rawlist',
          name: 'respuesta',
          default: 0,
          store: true,
          choices: ['foo', new inquirer.Separator('spacer'), 'bar', 'baz']
        };
        const result = promptSuggestion.prefillQuestions(this.store, question)[0];
        assert.equal(result.default, 2);
      });
    });
  });

  describe('.storeAnswers()', () => {
    beforeEach(function () {
      this.store.set('promptValues', {respuesta: 'foo'});
    });

    it('require a store parameter', () => {
      assert.throws(promptSuggestion.storeAnswers.bind(null));
    });

    it('require a question parameter', function () {
      assert.throws(promptSuggestion.storeAnswers.bind(this.store));
    });

    it('require a answer parameter', function () {
      assert.throws(promptSuggestion.storeAnswers.bind(this.store, []));
    });

    it('take a answer parameter', function () {
      promptSuggestion.storeAnswers(this.store, [], {});
    });

    it('take a storeAll parameter', function () {
      promptSuggestion.storeAnswers(this.store, [], {}, true);
    });

    it('store answer in global store', function () {
      const question = {
        name: 'respuesta',
        default: 'bar',
        store: true
      };

      const mockAnswers = {
        respuesta: 'baz'
      };

      promptSuggestion.prefillQuestions(this.store, question);
      promptSuggestion.storeAnswers(this.store, question, mockAnswers);
      assert.equal(this.store.get('promptValues').respuesta, 'baz');
    });

    it('don\'t store default answer in global store', function () {
      const question = {
        name: 'respuesta',
        default: 'bar',
        store: true
      };

      const mockAnswers = {
        respuesta: 'bar'
      };

      this.store.delete('promptValues');
      promptSuggestion.prefillQuestions(this.store, question);
      promptSuggestion.storeAnswers(this.store, question, mockAnswers, false);
      assert.equal(this.store.get('promptValues'), undefined);
    });

    it('force store default answer in global store', function () {
      const question = {
        name: 'respuesta',
        default: 'bar',
        store: true
      };

      const mockAnswers = {
        respuesta: 'bar'
      };

      this.store.delete('promptValues');
      promptSuggestion.prefillQuestions(this.store, question);
      promptSuggestion.storeAnswers(this.store, question, mockAnswers, true);
      assert.equal(this.store.get('promptValues').respuesta, 'bar');
    });

    it('don\'t store answer in global store', function () {
      const question = {
        name: 'respuesta',
        default: 'bar',
        store: false
      };

      const mockAnswers = {
        respuesta: 'baz'
      };

      promptSuggestion.prefillQuestions(this.store, question);
      promptSuggestion.storeAnswers(this.store, question, mockAnswers);
      assert.equal(this.store.get('promptValues').respuesta, 'foo');
    });

    it('store answer from rawlist type', function () {
      const question = {
        type: 'rawlist',
        name: 'respuesta',
        default: 0,
        store: true,
        choices: ['foo', new inquirer.Separator('spacer'), 'bar', 'baz']
      };

      const mockAnswers = {
        respuesta: 'baz'
      };

      promptSuggestion.prefillQuestions(this.store, question);
      promptSuggestion.storeAnswers(this.store, question, mockAnswers);
      assert.equal(this.store.get('promptValues').respuesta, 'baz');
    });

    describe('empty sotre', () => {
      beforeEach(function () {
        this.store.delete('promptValues');
      });
      it('don\'t store default answer from rawlist type', function () {
        const question = {
          type: 'rawlist',
          name: 'respuesta',
          default: 0,
          store: true,
          choices: ['foo', new inquirer.Separator('spacer'), 'bar', 'baz']
        };

        const mockAnswers = {
          respuesta: 'foo'
        };

        promptSuggestion.prefillQuestions(this.store, question);
        promptSuggestion.storeAnswers(this.store, question, mockAnswers, false);
        assert.equal(this.store.get('promptValues'), undefined);
      });

      it('force store default answer from rawlist type', function () {
        const question = {
          type: 'rawlist',
          name: 'respuesta',
          default: 0,
          store: true,
          choices: ['foo', new inquirer.Separator('spacer'), 'bar', 'baz']
        };

        const mockAnswers = {
          respuesta: 'foo'
        };

        promptSuggestion.prefillQuestions(this.store, question);
        promptSuggestion.storeAnswers(this.store, question, mockAnswers, true);
        assert.equal(this.store.get('promptValues').respuesta, 'foo');
      });
    });

    it('store falsy answer (but not undefined) in global store', function () {
      const question = {
        name: 'respuesta',
        default: true,
        store: true
      };

      const mockAnswers = {
        respuesta: false
      };

      promptSuggestion.prefillQuestions(this.store, question);
      promptSuggestion.storeAnswers(this.store, question, mockAnswers);
      assert.equal(this.store.get('promptValues').respuesta, false);
    });
  });
});
