import assert from 'node:assert';
import path from 'node:path';
import { esmocha } from 'esmocha';
// eslint-disable-next-line n/file-extension-in-import
import { TestAdapter } from '@yeoman/adapter/testing';
import { stub as sinonStub, type SinonStub } from 'sinon';
import type { Data as TemplateData } from 'ejs';
import Environment from 'yeoman-environment';
import BaseGenerator from '../src/generator.js';
import Base from './utils.js';

const randomString = () => Math.random().toString(36).slice(7);
const createEnv = () => new Environment({ skipInstall: true, adapter: new TestAdapter() });

// Make copyTpl() call argument indices more readable
const ARG_FROM = 0;
const ARG_TO = 1;
const ARG_DATA = 2; // A.k.a. context
const ARG_TPLSETTINGS = 3; // Template settings
const ARG_COPYSETTINGS = 4;

type FSOpResult = {
  name: string;
  first: string;
  second?: string;
  dest: string;
  returnsUndefined?: boolean;
};

let testResults: FSOpResult[] = [];
testResults = testResults.concat([
  { name: 'readTemplate', first: 'templatePath', dest: 'read' },
  {
    name: 'copyTemplate',
    first: 'templatePath',
    second: 'destinationPath',
    dest: 'copy',
  },
  {
    name: 'copyTemplateAsync',
    first: 'templatePath',
    second: 'destinationPath',
    dest: 'copyAsync',
  },
  { name: 'readDestination', first: 'destinationPath', dest: 'read' },
  { name: 'writeDestination', first: 'destinationPath', dest: 'write' },
  {
    name: 'writeDestinationJSON',
    first: 'destinationPath',
    dest: 'writeJSON',
  },
  { name: 'deleteDestination', first: 'destinationPath', dest: 'delete' },
  {
    name: 'copyDestination',
    first: 'destinationPath',
    second: 'destinationPath',
    dest: 'copy',
  },
  {
    name: 'moveDestination',
    first: 'destinationPath',
    second: 'destinationPath',
    dest: 'move',
  },
  { name: 'existsDestination', first: 'destinationPath', dest: 'exists' },
  {
    name: 'renderTemplate',
    first: 'templatePath',
    second: 'destinationPath',
    dest: 'copyTpl',
    returnsUndefined: true,
  },
  {
    name: 'renderTemplateAsync',
    first: 'templatePath',
    second: 'destinationPath',
    dest: 'copyTplAsync',
  },
]);

type BaseGenPaths = Record<string, string>;

describe('generators.Base (actions/fs)', () => {
  const baseReturns: BaseGenPaths = {
    templatePath: `templatePath${randomString()}`,
    destinationPath: `destinationPath${randomString()}`,
  };
  const configGetAll = { foo: 'bar' };
  let returns: Record<string, any>;

  before(function () {
    this.timeout(10_000);
    this.gen = new Base({ env: createEnv(), resolved: 'unknown', help: true });
  });

  beforeEach(function () {
    returns = {};
    this.base = new BaseGenerator({ namespace: 'foo', help: true, resolved: 'unknown' });

    // Why not use a sinonStub for this.base.config as is done in #renderTemplate and #renderTemplateAsync below?
    //  this.base get config is not being tested in any way below.
    // @ts-expect-error Config is a string (not a symbol) and we know it exists on this.base  https://github.com/DefinitelyTyped/DefinitelyTyped/issues/33173
    esmocha.spyOn(this.base, 'config', 'get').mockReturnValue({
      getAll() {
        return configGetAll;
      },
    });

    Object.assign(this.base, {
      templatePath: sinonStub().returns(baseReturns.templatePath),
      destinationPath: sinonStub().returns(baseReturns.destinationPath),
      renderTemplate: Base.prototype.renderTemplate,
      renderTemplateAsync: Base.prototype.renderTemplateAsync,
      renderTemplates: Base.prototype.renderTemplates,
      renderTemplatesAsync: Base.prototype.renderTemplatesAsync,
      checkEnvironmentVersion() {},
      fs: {},
    });
    for (const op of [
      'read',
      'copy',
      'copyAsync',
      'write',
      'writeJSON',
      'delete',
      'move',
      'exists',
      'copyTpl',
      'copyTplAsync',
    ]) {
      const returnValue = randomString();
      this.base.fs[op] = sinonStub().returns(returnValue);
      returns[op] = returnValue;
    }
  });

  for (const operation of testResults) {
    const passedArg1 = randomString();
    const passedArg2 = randomString();
    const passedArg3 = {};
    const passedArg4 = { foo: 'bar' };

    // eslint-disable-next-line @typescript-eslint/no-loop-func
    describe(`#${operation.name}`, () => {
      let returnValue: any;
      let expectedReturn: string | undefined;
      let firstArgumentHandler: SinonStub;
      let secondArgumentHandler: SinonStub;

      beforeEach(async function () {
        returnValue = await this.base[operation.name](passedArg1, passedArg2, passedArg3, passedArg4);

        expectedReturn = operation.returnsUndefined ? undefined : returns[operation.dest];
        firstArgumentHandler = this.base[operation.first];
        if (operation.second !== undefined && operation.second !== null) {
          secondArgumentHandler = this.base[operation.second];
        }
      });

      it('exists on the generator', () => {
        assert(operation.name in Base.prototype);
      });

      it('returns the correct value', () => {
        assert.equal(returnValue, expectedReturn);
      });

      it('handles the first parameter', () => {
        assert.equal(firstArgumentHandler.getCall(0).args[0], passedArg1);
      });

      it('handles the second parameter', () => {
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
  }

  describe('#renderTemplate', () => {
    const getAllReturn = {};
    const getPathReturn = { foo: 'bar' };

    beforeEach(function () {
      sinonStub(this.gen, 'sourceRoot').returns('');
      sinonStub(this.gen, 'destinationRoot').returns('');
      sinonStub(this.gen.config, 'getAll').returns(getAllReturn);
      sinonStub(this.gen.config, 'getPath').returns(getPathReturn);

      for (const op of ['copyTpl']) {
        const returnValue = randomString();
        sinonStub(this.gen.fs, op).returns(returnValue);
        returns[op] = returnValue;
      }
    });

    afterEach(function () {
      this.gen.sourceRoot.restore();
      this.gen.destinationRoot.restore();
      this.gen.config.getAll.restore();
      this.gen.config.getPath.restore();
      for (const op of ['copyTpl']) this.gen.fs[op].restore();
    });

    it('gets default data from config', function () {
      this.gen.renderTemplate('a', 'b');
      const { copyTpl } = this.gen.fs;

      assert(copyTpl.calledOnce);
      const firsCall = copyTpl.getCall(0);
      assert.equal(firsCall.args[ARG_DATA], getAllReturn);
    });

    it('gets data with path from config', function () {
      this.gen.renderTemplate('a', 'b', 'test');
      const { copyTpl } = this.gen.fs;

      assert(copyTpl.calledOnce);
      const firsCall = copyTpl.getCall(0);
      assert.equal(firsCall.args[ARG_DATA], getPathReturn);
    });

    it('concatenates source and destination', function () {
      const source = ['a', 'b'];
      const destination = ['b', 'a'];
      const data = {};

      this.gen.renderTemplate(source, destination, data);
      const { copyTpl } = this.gen.fs;

      assert(copyTpl.calledOnce);
      const firsCall = copyTpl.getCall(0);
      assert.equal(firsCall.args[ARG_FROM], path.join(...source));
      assert.equal(firsCall.args[ARG_TO], path.join(...destination));
      assert.equal(firsCall.args[ARG_DATA], data);
    });
  });

  describe('#renderTemplateAsync', () => {
    const getAllReturn = {};
    const getPathReturn = { foo: 'bar' };

    beforeEach(function () {
      sinonStub(this.gen, 'sourceRoot').returns('');
      sinonStub(this.gen, 'destinationRoot').returns('');
      sinonStub(this.gen.config, 'getAll').returns(getAllReturn);
      sinonStub(this.gen.config, 'getPath').returns(getPathReturn);

      for (const op of ['copyTplAsync']) {
        const returnValue = randomString();
        sinonStub(this.gen.fs, op).returns(returnValue);
        returns[op] = returnValue;
      }
    });

    afterEach(function () {
      this.gen.sourceRoot.restore();
      this.gen.destinationRoot.restore();
      this.gen.config.getAll.restore();
      this.gen.config.getPath.restore();
      for (const op of ['copyTplAsync']) this.gen.fs[op].restore();
    });

    it('gets default data from config', function () {
      this.gen.renderTemplateAsync('a', 'b');
      const { copyTplAsync } = this.gen.fs;

      assert(copyTplAsync.calledOnce);
      const firsCall = copyTplAsync.getCall(0);
      assert.equal(firsCall.args[ARG_DATA], getAllReturn);
    });

    it('gets data with path from config', async function () {
      await this.gen.renderTemplateAsync('a', 'b', 'test');
      const { copyTplAsync } = this.gen.fs;

      assert(copyTplAsync.calledOnce);
      const firsCall = copyTplAsync.getCall(0);
      assert.equal(firsCall.args[ARG_DATA], getPathReturn);
    });

    it('concatenates source and destination', function () {
      const source = ['a', 'b'];
      const destination = ['b', 'a'];
      const data = {};

      this.gen.renderTemplateAsync(source, destination, data);
      const { copyTplAsync } = this.gen.fs;

      assert(copyTplAsync.calledOnce);
      const firsCall = copyTplAsync.getCall(0);
      assert.equal(firsCall.args[ARG_FROM], path.join(...source));
      assert.equal(firsCall.args[ARG_TO], path.join(...destination));
      assert.equal(firsCall.args[ARG_DATA], data);
    });
  });

  describe('#renderTemplates', () => {
    beforeEach(function () {
      sinonStub(this.gen, 'sourceRoot').returns('');
      sinonStub(this.gen, 'destinationRoot').returns('');

      for (const op of ['copyTpl']) {
        const returnValue = randomString();
        sinonStub(this.gen.fs, op).returns(returnValue);
        returns[op] = returnValue;
      }
    });

    afterEach(function () {
      this.gen.sourceRoot.restore();
      this.gen.destinationRoot.restore();
      for (const op of ['copyTpl']) this.gen.fs[op].restore();
    });

    it('handles 1 template', function () {
      const passedArg1 = 'foo';
      const data = {};
      this.gen.renderTemplates([{ source: passedArg1 }], data);

      const { copyTpl } = this.gen.fs;
      assert.equal(copyTpl.callCount, 1);

      const firsCall = copyTpl.getCall(0);
      assert.equal(firsCall.args[ARG_FROM], passedArg1);
      assert.equal(firsCall.args[ARG_TO], passedArg1);
      assert.equal(firsCall.args[ARG_DATA], data);
    });

    it('handles more than 1 template', function () {
      const passedArg1 = 'foo';
      const secondCallArg1 = 'bar';
      const secondCallArg2 = 'bar2';
      const data = {};
      const templateOptions = { foo: '123' };
      const copyOptions = {};

      this.gen.renderTemplates(
        [
          { source: passedArg1 },
          {
            source: secondCallArg1,
            destination: secondCallArg2,
            templateOptions,
            copyOptions,
          },
        ],
        data,
      );

      const { copyTpl } = this.gen.fs;
      assert.equal(copyTpl.callCount, 2);

      const firsCall = copyTpl.getCall(0);
      assert.equal(firsCall.args[ARG_FROM], passedArg1);
      assert.equal(firsCall.args[ARG_TO], passedArg1);
      assert.equal(firsCall.args[ARG_DATA], data);

      const secondCall = copyTpl.getCall(1);
      assert.equal(secondCall.args[ARG_FROM], secondCallArg1);
      assert.equal(secondCall.args[ARG_TO], secondCallArg2);
      assert.equal(secondCall.args[ARG_DATA], data);
      assert.equal(secondCall.args[ARG_TPLSETTINGS].foo, templateOptions.foo);
      assert.equal(secondCall.args[ARG_COPYSETTINGS], copyOptions);
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
          { source: passedArg1 },
          {
            source: secondCallArg1,
            when: () => false,
            destination: secondCallArg2,
            templateOptions,
            copyOptions,
          },
        ],
        data,
      );

      const { copyTpl } = this.gen.fs;
      assert.equal(copyTpl.callCount, 1);

      const firsCall = copyTpl.getCall(0);
      assert.equal(firsCall.args[ARG_FROM], passedArg1);
      assert.equal(firsCall.args[ARG_TO], passedArg1);
      assert.equal(firsCall.args[ARG_DATA], data);
    });

    it('passes the data to when callback', function () {
      const passedArg1 = 'foo';
      const templateData: TemplateData = {};
      let receivedData: TemplateData = { name: 'original value' }; // Set this to something so TypeScript doesn't complain that it is used before set

      this.gen.renderTemplates(
        [
          {
            source: passedArg1,
            when(data: TemplateData) {
              receivedData = data;
            },
          },
        ],
        templateData,
      );

      const { copyTpl } = this.gen.fs;
      assert.equal(copyTpl.callCount, 0);

      assert.equal(receivedData, templateData);
    });
  });

  describe('#renderTemplatesAsync', () => {
    beforeEach(function () {
      sinonStub(this.gen, 'sourceRoot').returns('');
      sinonStub(this.gen, 'destinationRoot').returns('');

      for (const op of ['copyTplAsync']) {
        const returnValue = randomString();
        sinonStub(this.gen.fs, op).returns(returnValue);
        returns[op] = returnValue;
      }
    });

    afterEach(function () {
      this.gen.sourceRoot.restore();
      this.gen.destinationRoot.restore();
      for (const op of ['copyTplAsync']) this.gen.fs[op].restore();
    });

    it('handles 1 template', function () {
      const passedArg1 = 'foo';
      const data = {};
      this.gen.renderTemplatesAsync([{ source: passedArg1 }], data);

      const { copyTplAsync } = this.gen.fs;
      assert.equal(copyTplAsync.callCount, 1);

      const firsCall = copyTplAsync.getCall(0);
      assert.equal(firsCall.args[ARG_FROM], passedArg1);
      assert.equal(firsCall.args[ARG_TO], passedArg1);
      assert.equal(firsCall.args[ARG_DATA], data);
    });

    it('handles more than 1 template', function () {
      const passedArg1 = 'foo';
      const secondCallArg1 = 'bar';
      const secondCallArg2 = 'bar2';
      const data = {};
      const templateOptions = { foo: '123' };
      const copyOptions = {};

      this.gen.renderTemplatesAsync(
        [
          { source: passedArg1 },
          {
            source: secondCallArg1,
            destination: secondCallArg2,
            templateOptions,
            copyOptions,
          },
        ],
        data,
      );

      const { copyTplAsync } = this.gen.fs;
      assert.equal(copyTplAsync.callCount, 2);

      const firsCall = copyTplAsync.getCall(0);
      assert.equal(firsCall.args[ARG_FROM], passedArg1);
      assert.equal(firsCall.args[ARG_TO], passedArg1);
      assert.equal(firsCall.args[ARG_DATA], data);

      const secondCall = copyTplAsync.getCall(1);
      assert.equal(secondCall.args[ARG_FROM], secondCallArg1);
      assert.equal(secondCall.args[ARG_TO], secondCallArg2);
      assert.equal(secondCall.args[ARG_DATA], data);
      assert.equal(secondCall.args[ARG_TPLSETTINGS].foo, templateOptions.foo);
      assert.equal(secondCall.args[ARG_COPYSETTINGS], copyOptions);
    });

    it('skips templates based on when callback', async function () {
      const passedArg1 = 'foo';
      const secondCallArg1 = 'bar';
      const secondCallArg2 = 'bar2';
      const data = {};
      const templateOptions = {};
      const copyOptions = {};

      await this.gen.renderTemplatesAsync(
        [
          { source: passedArg1 },
          {
            source: secondCallArg1,
            when: () => false,
            destination: secondCallArg2,
            templateOptions,
            copyOptions,
          },
        ],
        data,
      );

      const { copyTplAsync } = this.gen.fs;
      assert.equal(copyTplAsync.callCount, 1);

      const firsCall = copyTplAsync.getCall(0);
      assert.equal(firsCall.args[ARG_FROM], passedArg1);
      assert.equal(firsCall.args[ARG_TO], passedArg1);
      assert.equal(firsCall.args[ARG_DATA], data);
    });

    it('passes the data to when callback', function () {
      const passedArg1 = 'foo';
      const templateData: TemplateData = {};
      let receivedData: TemplateData = { name: 'original value' }; // Set this to something so TypeScript doesn't complain that it is used before set

      this.gen.renderTemplatesAsync(
        [
          {
            source: passedArg1,
            when(data: TemplateData) {
              receivedData = data;
            },
          },
        ],
        templateData,
      );

      const { copyTplAsync } = this.gen.fs;
      assert.equal(copyTplAsync.callCount, 0);

      assert.equal(receivedData, templateData);
    });
  });
});
