'use strict';
const assert = require('assert');
const path = require('path');
const sinon = require('sinon');
const Environment = require('yeoman-environment');

const fsAction = require('../lib/actions/fs');
const Base = require('../lib');

const randomString = () => Math.random().toString(36).slice(7);

describe('generators.Base (actions/fs)', function () {
  const baseReturns = {
    templatePath: `templatePath${randomString()}`,
    destinationPath: `destinationPath${randomString()}`
  };
  const configGetAll = {foo: 'bar'};
  let returns;

  before(function () {
    this.timeout(10000);
    this.gen = new Base({env: Environment.createEnv()});
  });

  beforeEach(function () {
    returns = {};
    this.base = {
      templatePath: sinon.stub().returns(baseReturns.templatePath),
      destinationPath: sinon.stub().returns(baseReturns.destinationPath),
      renderTemplate: Base.prototype.renderTemplate,
      renderTemplates: Base.prototype.renderTemplates,
      config: {
        getAll() {
          return configGetAll;
        }
      },
      fs: {}
    };
    [
      'read',
      'copy',
      'write',
      'writeJSON',
      'delete',
      'move',
      'exists',
      'copyTpl'
    ].forEach((op) => {
      const returnValue = randomString();
      this.base.fs[op] = sinon.stub().returns(returnValue);
      returns[op] = returnValue;
    });
    Object.assign(this.base, fsAction);
  });

  [
    {name: 'readTemplate', first: 'templatePath', dest: 'read'},
    {
      name: 'copyTemplate',
      first: 'templatePath',
      second: 'destinationPath',
      dest: 'copy'
    },
    {name: 'readDestination', first: 'destinationPath', dest: 'read'},
    {name: 'writeDestination', first: 'destinationPath', dest: 'write'},
    {name: 'writeDestinationJSON', first: 'destinationPath', dest: 'writeJSON'},
    {name: 'deleteDestination', first: 'destinationPath', dest: 'delete'},
    {
      name: 'copyDestination',
      first: 'destinationPath',
      second: 'destinationPath',
      dest: 'copy'
    },
    {
      name: 'moveDestination',
      first: 'destinationPath',
      second: 'destinationPath',
      dest: 'move'
    },
    {name: 'existsDestination', first: 'destinationPath', dest: 'exists'},
    {
      name: 'renderTemplate',
      first: 'templatePath',
      second: 'destinationPath',
      dest: 'copyTpl',
      returnsUndefined: true
    }
  ].forEach((operation) => {
    const passedArg1 = randomString();
    const passedArg2 = randomString();
    const passedArg3 = {};
    const passedArg4 = {foo: 'bar'};

    describe(`#${operation.name}`, () => {
      let returnValue;
      let expectedReturn;
      let firstArgumentHandler;
      let secondArgumentHandler;

      beforeEach(function () {
        returnValue = this.base[operation.name](
          passedArg1,
          passedArg2,
          passedArg3,
          passedArg4
        );

        expectedReturn = operation.returnsUndefined
          ? undefined
          : returns[operation.dest];
        firstArgumentHandler = this.base[operation.first];
        secondArgumentHandler = this.base[operation.second];
      });

      it('exists on the generator', function () {
        assert(Base.prototype[operation.name]);
      });

      it('returns the correct value', function () {
        assert.equal(returnValue, expectedReturn);
      });

      it('handles the first parameter', function () {
        assert.equal(firstArgumentHandler.getCall(0).args[0], passedArg1);
      });

      it('handles the second parameter', function () {
        if (operation.second && operation.first === operation.second) {
          assert(secondArgumentHandler.calledTwice);
          assert.equal(secondArgumentHandler.getCall(1).args[0], passedArg2);
        } else if (operation.second) {
          assert(secondArgumentHandler.calledOnce);
          assert(firstArgumentHandler.calledOnce);
          assert.equal(secondArgumentHandler.getCall(0).args[0], passedArg2);
        }
      });

      it('calls fs with correct arguments', function () {
        const destCall = this.base.fs[operation.dest];
        assert(destCall.calledOnce);
        const call = destCall.getCall(0);
        // First argument should be the trated first arguments
        assert.equal(call.args[0], baseReturns[operation.first]);

        // Second argument should be the trated first arguments
        if (operation.second) {
          assert.equal(call.args[1], baseReturns[operation.second]);
        } else {
          assert.equal(call.args[1], passedArg2);
        }

        assert.equal(call.args[2], passedArg3);
        assert.equal(call.args[3].foo, passedArg4.foo);
      });
    });
  });

  describe('#renderTemplate', () => {
    const getAllReturn = {};
    const getPathReturn = {foo: 'bar'};

    beforeEach(function () {
      sinon.stub(this.gen, 'sourceRoot').returns('');
      sinon.stub(this.gen, 'destinationRoot').returns('');
      sinon.stub(this.gen.config, 'getAll').returns(getAllReturn);
      sinon.stub(this.gen.config, 'getPath').returns(getPathReturn);

      ['copyTpl'].forEach((op) => {
        const returnValue = randomString();
        sinon.stub(this.gen.fs, op).returns(returnValue);
        returns[op] = returnValue;
      });
    });

    afterEach(function () {
      this.gen.sourceRoot.restore();
      this.gen.destinationRoot.restore();
      this.gen.config.getAll.restore();
      this.gen.config.getPath.restore();
      ['copyTpl'].forEach((op) => this.gen.fs[op].restore());
    });

    it('gets default data from config', function () {
      this.gen.renderTemplate('a', 'b');
      const {copyTpl} = this.gen.fs;

      assert(copyTpl.calledOnce);
      const firsCall = copyTpl.getCall(0);
      assert.equal(firsCall.args[2], getAllReturn);
    });

    it('gets data with path from config', function () {
      this.gen.renderTemplate('a', 'b', 'test');
      const {copyTpl} = this.gen.fs;

      assert(copyTpl.calledOnce);
      const firsCall = copyTpl.getCall(0);
      assert.equal(firsCall.args[2], getPathReturn);
    });

    it('concatenates source and destination', function () {
      const source = ['a', 'b'];
      const destination = ['b', 'a'];
      const data = {};

      this.gen.renderTemplate(source, destination, data);
      const {copyTpl} = this.gen.fs;

      assert(copyTpl.calledOnce);
      const firsCall = copyTpl.getCall(0);
      assert.equal(firsCall.args[0], path.join(...source));
      assert.equal(firsCall.args[1], path.join(...destination));
      assert.equal(firsCall.args[2], data);
    });
  });

  describe('#renderTemplates', () => {
    beforeEach(function () {
      sinon.stub(this.gen, 'sourceRoot').returns('');
      sinon.stub(this.gen, 'destinationRoot').returns('');

      ['copyTpl'].forEach((op) => {
        const returnValue = randomString();
        sinon.stub(this.gen.fs, op).returns(returnValue);
        returns[op] = returnValue;
      });
    });

    afterEach(function () {
      this.gen.sourceRoot.restore();
      this.gen.destinationRoot.restore();
      ['copyTpl'].forEach((op) => this.gen.fs[op].restore());
    });

    it('handles 1 template', function () {
      const passedArg1 = 'foo';
      const data = {};
      this.gen.renderTemplates([{source: passedArg1}], data);

      const {copyTpl} = this.gen.fs;
      assert.equal(copyTpl.callCount, 1);

      const firsCall = copyTpl.getCall(0);
      assert.equal(firsCall.args[0], passedArg1);
      assert.equal(firsCall.args[1], passedArg1);
      assert.equal(firsCall.args[2], data);
    });

    it('handles more than 1 template', function () {
      const passedArg1 = 'foo';
      const secondCallArg1 = 'bar';
      const secondCallArg2 = 'bar2';
      const data = {};
      const templateOptions = {foo: '123'};
      const copyOptions = {};

      this.gen.renderTemplates(
        [
          {source: passedArg1},
          {
            source: secondCallArg1,
            destination: secondCallArg2,
            templateOptions,
            copyOptions
          }
        ],
        data
      );

      const {copyTpl} = this.gen.fs;
      assert.equal(copyTpl.callCount, 2);

      const firsCall = copyTpl.getCall(0);
      assert.equal(firsCall.args[0], passedArg1);
      assert.equal(firsCall.args[1], passedArg1);
      assert.equal(firsCall.args[2], data);

      const secondCall = copyTpl.getCall(1);
      assert.equal(secondCall.args[0], secondCallArg1);
      assert.equal(secondCall.args[1], secondCallArg2);
      assert.equal(secondCall.args[2], data);
      assert.equal(secondCall.args[3].foo, templateOptions.foo);
      assert.equal(secondCall.args[4], copyOptions);
    });

    it('skips templates based on when callback', function () {
      const passedArg1 = 'foo';
      const secondCallArg1 = 'bar';
      const secondCallArg2 = 'bar2';
      const data = {};
      const templateOptions = {};
      const copyOptions = {};

      this.gen.renderTemplates(
        [
          {source: passedArg1},
          {
            source: secondCallArg1,
            when: () => false,
            destination: secondCallArg2,
            templateOptions,
            copyOptions
          }
        ],
        data
      );

      const {copyTpl} = this.gen.fs;
      assert.equal(copyTpl.callCount, 1);

      const firsCall = copyTpl.getCall(0);
      assert.equal(firsCall.args[0], passedArg1);
      assert.equal(firsCall.args[1], passedArg1);
      assert.equal(firsCall.args[2], data);
    });

    it('passes the data to when callback', function () {
      const passedArg1 = 'foo';
      const templateData = {};
      let receivedData;

      this.gen.renderTemplates(
        [
          {
            source: passedArg1,
            when: (data) => {
              receivedData = data;
            }
          }
        ],
        templateData
      );

      const {copyTpl} = this.gen.fs;
      assert.equal(copyTpl.callCount, 0);

      assert.equal(receivedData, templateData);
    });
  });
});
