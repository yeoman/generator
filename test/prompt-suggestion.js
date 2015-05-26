/*global describe, it, before, after, beforeEach, afterEach */
'use strict';
var path = require('path');
var assert = require('assert');
var os = require('os');
var rimraf = require('rimraf');
var inquirer = require('inquirer');
var env = require('yeoman-environment');
var FileEditor = require('mem-fs-editor');
var Storage = require('../lib/util/storage');
var promptSuggestion = require('../lib/util/prompt-suggestion');

describe('PromptSuggestion', function () {
  beforeEach(function () {
    this.memFs = env.createEnv().sharedFs;
    this.fs = FileEditor.create(this.memFs);
    this.storePath = path.join(os.tmpdir(), 'suggestion-config.json');
    this.store = new Storage('suggestion', this.fs, this.storePath);
    this.store.set('promptValues', { respuesta: 'foo' });
  });

  afterEach(function (done) {
    rimraf(this.storePath, done);
  });

  describe('.prefillQuestions()', function () {
    it('require a store parameter', function () {
      assert.throws(promptSuggestion.prefillQuestions.bind(null));
    });

    it('require a questions parameter', function () {
      assert.throws(promptSuggestion.prefillQuestions.bind(this.store));
    });

    it('take a questions parameter', function () {
      promptSuggestion.prefillQuestions(this.store, []);
    });

    it('take a question object', function () {
      var question = {
        name: 'respuesta',
        default: 'bar',
        store: true
      };
      var result = promptSuggestion.prefillQuestions(this.store, question)[0];
      assert.equal(result.default, 'foo');
    });

    it('take a question array', function () {
      var question = [{
        name: 'respuesta',
        default: 'bar',
        store: true
      }];
      var result = promptSuggestion.prefillQuestions(this.store, question)[0];
      assert.equal(result.default, 'foo');
    });

    it('don\'t override default when store is set to false', function () {
      var question = {
        name: 'respuesta',
        default: 'bar',
        store: false
      };
      var result = promptSuggestion.prefillQuestions(this.store, question)[0];
      assert.equal(result.default, 'bar');
    });

    it('override default when store is set to true', function () {
      var question = {
        name: 'respuesta',
        default: 'bar',
        store: true
      };
      var result = promptSuggestion.prefillQuestions(this.store, question)[0];
      assert.equal(result.default, 'foo');
    });

    it('keep inquirer objects', function () {
      var question = {
        type: 'checkbox',
        name: 'respuesta',
        default: ['bar'],
        store: true,
        choices: [new inquirer.Separator('spacer')]
      };
      var result = promptSuggestion.prefillQuestions(this.store, question)[0];
      assert.ok(result.choices[0] instanceof inquirer.Separator);
    });

    describe('take a checkbox', function () {
      beforeEach(function () {
        this.store.set('promptValues', {
          respuesta: ['foo']
        });
      });

      it('override default from an array with objects', function () {
        var question = {
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
        var result = promptSuggestion.prefillQuestions(this.store, question)[0];

        result.choices.forEach(function (choice) {
          assert.equal(choice.checked, false);
        });

        assert.deepEqual(result.default, ['foo']);
      });

      it('override default from an array with strings', function () {
        var question = {
          type: 'checkbox',
          name: 'respuesta',
          default: ['bar'],
          store: true,
          choices: ['foo', new inquirer.Separator('spacer'), 'bar', 'baz']
        };
        var result = promptSuggestion.prefillQuestions(this.store, question)[0];
        assert.deepEqual(result.default, ['foo']);
      });

      describe('with multiple defaults', function () {
        beforeEach(function () {
          this.store.set('promptValues', {
            respuesta: ['foo', 'bar']
          });
        });

        it('from an array with objects', function () {
          var question = {
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
          var result = promptSuggestion.prefillQuestions(this.store, question)[0];

          result.choices.forEach(function (choice) {
            assert.equal(choice.checked, false);
          });

          assert.deepEqual(result.default, ['foo', 'bar']);
        });

        it('from an array with strings', function () {
          var question = {
            type: 'checkbox',
            name: 'respuesta',
            default: ['bar'],
            store: true,
            choices: ['foo', new inquirer.Separator('spacer'), 'bar', 'baz']
          };
          var result = promptSuggestion.prefillQuestions(this.store, question)[0];
          assert.deepEqual(result.default, ['foo', 'bar']);
        });
      });
    });

    describe('take a rawlist / expand', function () {
      beforeEach(function () {
        this.store.set('promptValues', {
          respuesta: 'bar'
        });
      });

      it('override default arrayWithObjects', function () {
        var question = {
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
        var result = promptSuggestion.prefillQuestions(this.store, question)[0];
        assert.equal(result.default, 2);
      });

      it('override default arrayWithObjects', function () {
        var question = {
          type: 'rawlist',
          name: 'respuesta',
          default: 0,
          store: true,
          choices: ['foo', new inquirer.Separator('spacer'), 'bar', 'baz']
        };
        var result = promptSuggestion.prefillQuestions(this.store, question)[0];
        assert.equal(result.default, 2);
      });
    });
  });

  describe('.storeAnswers()', function () {
    beforeEach(function () {
      this.store.set('promptValues', { respuesta: 'foo' });
    });

    it('require a store parameter', function () {
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

    it('store answer in global store', function () {
      var question = {
        name: 'respuesta',
        default: 'bar',
        store: true
      };

      var mockAnswers = {
        respuesta: 'baz'
      };

      promptSuggestion.prefillQuestions(this.store, question);
      promptSuggestion.storeAnswers(this.store, question, mockAnswers);
      assert.equal(this.store.get('promptValues').respuesta, 'baz');
    });

    it('don\'t store answer in global store', function () {
      var question = {
        name: 'respuesta',
        default: 'bar',
        store: false
      };

      var mockAnswers = {
        respuesta: 'baz'
      };

      promptSuggestion.prefillQuestions(this.store, question);
      promptSuggestion.storeAnswers(this.store, question, mockAnswers);
      assert.equal(this.store.get('promptValues').respuesta, 'foo');
    });

    it('store answer from rawlist type', function () {
      var question = {
        type: 'rawlist',
        name: 'respuesta',
        default: 0,
        store: true,
        choices: ['foo', new inquirer.Separator('spacer'), 'bar', 'baz']
      };

      var mockAnswers = {
        respuesta: 'baz'
      };

      promptSuggestion.prefillQuestions(this.store, question);
      promptSuggestion.storeAnswers(this.store, question, mockAnswers);
      assert.equal(this.store.get('promptValues').respuesta, 'baz');
    });

    it('store falsy answer (but not undefined) in global store', function () {
      var question = {
        name: 'respuesta',
        default: true,
        store: true
      };

      var mockAnswers = {
        respuesta: false
      };

      promptSuggestion.prefillQuestions(this.store, question);
      promptSuggestion.storeAnswers(this.store, question, mockAnswers);
      assert.equal(this.store.get('promptValues').respuesta, false);
    });
  });
});
