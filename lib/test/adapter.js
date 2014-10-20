'use strict';

var _ = require('lodash');
var inquirer = require('inquirer');
var sinon = require('sinon');
var events = require('events');

function DummyPrompt(answers, q) {
  this.answers = answers;
  this.question = q;
}

DummyPrompt.prototype.run = function (cb) {
  setImmediate(function () {
    cb(this.answers[this.question.name] || this.question.default);
  }.bind(this));
};

function TestAdapter(answers) {

  answers = answers || {};

  this.prompt = inquirer.createPromptModule();

  Object.keys(this.prompt.prompts).forEach(function (promptName) {
    this.prompt.registerPrompt(promptName, DummyPrompt.bind(DummyPrompt, answers));
  }, this);

  this.diff = sinon.spy();

  this.log = sinon.spy();

  _.extend(this.log, events.EventEmitter.prototype);

  // make sure all log methods are defined
  [
    'write',
    'writeln',
    'ok',
    'error',
    'skip',
    'force',
    'create',
    'invoke',
    'conflict',
    'identical',
    'info',
    'table'
  ].forEach(function (methodName) {
    this.log[methodName] = sinon.stub().returns(this.log);
  }, this);

}

module.exports = {
  DummyPrompt: DummyPrompt,
  TestAdapter: TestAdapter
};
