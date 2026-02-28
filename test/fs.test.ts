import assert from 'node:assert';
import path from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestAdapter } from '@yeoman/adapter/testing';
import { type SinonStub, stub as sinonStub } from 'sinon';
import type { Data as TemplateData } from 'ejs';
import Environment from 'yeoman-environment';
import { BaseGenerator } from '../src/generator.js';
import Base from './utils.js';

const randomString = () => Math.random().toString(36).slice(7);
const createEnv = () => new Environment({ skipInstall: true, adapter: new TestAdapter() });

// Make copyTpl() call argument indices more readable
const ARG_FROM = 0;
const ARG_TO = 1;
const ARG_DATA = 2; // A.k.a. context
const ARG_COPYSETTINGS = 3;

type FSOpResult = {
  name: string;
  first?: string;
  second?: string;
  fromBasePath?: string;
  dest: string;
  returnsUndefined?: boolean;
};

let testResults: FSOpResult[] = [];
testResults = [
  ...testResults,
  { name: 'readTemplate', first: 'templatePath', dest: 'read' },
  {
    name: 'copyTemplate',
    second: 'destinationPath',
    fromBasePath: 'templatePath',
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
    second: 'destinationPath',
    fromBasePath: 'destinationPath',
    dest: 'copy',
  },
  {
    name: 'moveDestination',
    second: 'destinationPath',
    fromBasePath: 'destinationPath',
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
];

type BaseGenPaths = Record<string, string>;

describe('generators.Base (actions/fs)', () => {
  const baseReturns: BaseGenPaths = {
    templatePath: `templatePath${randomString()}`,
    destinationPath: `destinationPath${randomString()}`,
  };
  const configGetAll = { foo: 'bar' };
  let returns: Record<string, any>;
  let gen: Base;
  let base: BaseGenerator;

  beforeAll(() => {
    gen = new Base({ env: createEnv(), resolved: 'unknown', help: true });
  }, 10_000);

  beforeEach(() => {
    returns = {};
    base = new BaseGenerator({ namespace: 'foo', help: true, resolved: 'unknown' });

    // Why not use a sinonStub for base.config as is done in #renderTemplate and #renderTemplateAsync below?
    //  base get config is not being tested in any way below.
    // @ts-expect-error Config is a string (not a symbol) and we know it exists on base  https://github.com/DefinitelyTyped/DefinitelyTyped/issues/33173
    vi.spyOn(base, 'config', 'get').mockReturnValue({
      getAll() {
        return configGetAll;
      },
    });

    Object.assign(base, {
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
      base.fs[op] = sinonStub().returns(returnValue);
      returns[op] = returnValue;
    }
  });

  for (const operation of testResults) {
    const passedArg1 = randomString();
    const passedArg2 = randomString();
    const passedArg3: any = {};
    const passedArg4 = { foo: 'bar' };

    describe(`#${operation.name}`, () => {
      let returnValue: any;
      let expectedReturn: string | undefined;
      let firstArgumentHandler: SinonStub | undefined;
      let secondArgumentHandler: SinonStub;

      beforeEach(async () => {
        returnValue = await base[operation.name](passedArg1, passedArg2, passedArg3, passedArg4);

        expectedReturn = operation.returnsUndefined ? undefined : returns[operation.dest];
        firstArgumentHandler = operation.first ? base[operation.first] : undefined;
        if (operation.second !== undefined && operation.second !== null) {
          secondArgumentHandler = base[operation.second];
        }
      });

      it('exists on the generator', () => {
        assert.ok(operation.name in Base.prototype);
      });

      it('returns the correct value', () => {
        assert.equal(returnValue, expectedReturn);
      });

      it('handles the first parameter', () => {
        if (firstArgumentHandler) {
          assert.equal(firstArgumentHandler.getCall(0).args[0], passedArg1);
        }
      });

      it.skip('handles the second parameter', () => {
        if (operation.second && operation.first === operation.second) {
          assert.ok(secondArgumentHandler.calledTwice);
          expect(secondArgumentHandler.getCall(1).args[0]).toMatch(passedArg2);
        } else if (operation.second) {
          assert.ok(secondArgumentHandler.calledOnce);
          expect(secondArgumentHandler.getCall(0).args[0]).toMatch(passedArg2);
          if (firstArgumentHandler) {
            assert.ok(firstArgumentHandler.calledOnce);
          }
        }
      });

      it('calls fs with correct arguments', () => {
        const destCall = base.fs[operation.dest];
        assert.ok(destCall.calledOnce);
        const call = destCall.getCall(0);
        // First argument should be the trated first arguments
        expect(call.args[0]).toMatch(operation.first ? baseReturns[operation.first] : passedArg1);

        // Second argument should be the trated first arguments
        if (operation.second) {
          expect(call.args[1]).toMatch(baseReturns[operation.second]);
        } else {
          expect(call.args[1]).toMatch(passedArg2);
        }

        if (operation.dest === 'copy' || operation.dest === 'move') {
          expect(call.args[2]).toMatchObject(passedArg3);
        } else {
          expect(call.args[2]).toMatchObject(passedArg3);
        }
        expect(call.args[3].foo).toMatch(passedArg4.foo);
        if (operation.fromBasePath) {
          expect(call.args[2].fromBasePath).toMatch(baseReturns[operation.fromBasePath]);
        }
      });
    });
  }

  describe('#renderTemplate', () => {
    const getAllReturn = {};
    const getPathReturn = { foo: 'bar' };

    beforeEach(() => {
      sinonStub(gen, 'sourceRoot').returns('');
      sinonStub(gen, 'destinationRoot').returns('');
      sinonStub(gen.config, 'getAll').returns(getAllReturn);
      sinonStub(gen.config, 'getPath').returns(getPathReturn);

      for (const op of ['copyTpl']) {
        const returnValue = randomString();
        sinonStub(gen.fs, op).returns(returnValue);
        returns[op] = returnValue;
      }
    });

    afterEach(() => {
      gen.sourceRoot.restore();
      gen.destinationRoot.restore();
      gen.config.getAll.restore();
      gen.config.getPath.restore();
      for (const op of ['copyTpl']) gen.fs[op].restore();
    });

    it('gets default data from config', () => {
      gen.renderTemplate('a', 'b');
      const { copyTpl } = gen.fs;

      assert.ok(copyTpl.calledOnce);
      const firsCall = copyTpl.getCall(0);
      assert.equal(firsCall.args[ARG_DATA], getAllReturn);
    });

    it('gets data with path from config', () => {
      gen.renderTemplate('a', 'b', 'test');
      const { copyTpl } = gen.fs;

      assert.ok(copyTpl.calledOnce);
      const firsCall = copyTpl.getCall(0);
      assert.equal(firsCall.args[ARG_DATA], getPathReturn);
    });

    it('concatenates source and destination', () => {
      const source = ['a', 'b'];
      const destination = ['b', 'a'];
      const data = {};

      gen.renderTemplate(source, destination, data);
      const { copyTpl } = gen.fs;

      assert.ok(copyTpl.calledOnce);
      const firsCall = copyTpl.getCall(0);
      assert.equal(firsCall.args[ARG_FROM], path.join(...source));
      assert.equal(firsCall.args[ARG_TO], path.join(...destination));
      assert.equal(firsCall.args[ARG_DATA], data);
    });
  });

  describe('#renderTemplateAsync', () => {
    const getAllReturn = {};
    const getPathReturn = { foo: 'bar' };

    beforeEach(() => {
      sinonStub(gen, 'sourceRoot').returns('');
      sinonStub(gen, 'destinationRoot').returns('');
      sinonStub(gen.config, 'getAll').returns(getAllReturn);
      sinonStub(gen.config, 'getPath').returns(getPathReturn);

      for (const op of ['copyTplAsync']) {
        const returnValue = randomString();
        sinonStub(gen.fs, op).returns(returnValue);
        returns[op] = returnValue;
      }
    });

    afterEach(() => {
      gen.sourceRoot.restore();
      gen.destinationRoot.restore();
      gen.config.getAll.restore();
      gen.config.getPath.restore();
      for (const op of ['copyTplAsync']) gen.fs[op].restore();
    });

    it('gets default data from config', () => {
      gen.renderTemplateAsync('a', 'b');
      const { copyTplAsync } = gen.fs;

      assert.ok(copyTplAsync.calledOnce);
      const firsCall = copyTplAsync.getCall(0);
      assert.equal(firsCall.args[ARG_DATA], getAllReturn);
    });

    it('gets data with path from config', async () => {
      await gen.renderTemplateAsync('a', 'b', 'test');
      const { copyTplAsync } = gen.fs;

      assert.ok(copyTplAsync.calledOnce);
      const firsCall = copyTplAsync.getCall(0);
      assert.equal(firsCall.args[ARG_DATA], getPathReturn);
    });

    it('concatenates source and destination', () => {
      const source = ['a', 'b'];
      const destination = ['b', 'a'];
      const data = {};

      gen.renderTemplateAsync(source, destination, data);
      const { copyTplAsync } = gen.fs;

      assert.ok(copyTplAsync.calledOnce);
      const firsCall = copyTplAsync.getCall(0);
      assert.equal(firsCall.args[ARG_FROM], path.join(...source));
      assert.equal(firsCall.args[ARG_TO], path.join(...destination));
      assert.equal(firsCall.args[ARG_DATA], data);
    });
  });

  describe('#renderTemplates', () => {
    beforeEach(() => {
      sinonStub(gen, 'sourceRoot').returns('');
      sinonStub(gen, 'destinationRoot').returns('');

      for (const op of ['copyTpl']) {
        const returnValue = randomString();
        sinonStub(gen.fs, op).returns(returnValue);
        returns[op] = returnValue;
      }
    });

    afterEach(() => {
      gen.sourceRoot.restore();
      gen.destinationRoot.restore();
      for (const op of ['copyTpl']) gen.fs[op].restore();
    });

    it('handles 1 template', () => {
      const passedArg1 = 'foo';
      const data = {};
      gen.renderTemplates([{ source: passedArg1 }], data);

      const { copyTpl } = gen.fs;
      assert.equal(copyTpl.callCount, 1);

      const firsCall = copyTpl.getCall(0);
      assert.equal(firsCall.args[ARG_FROM], passedArg1);
      assert.equal(firsCall.args[ARG_TO], passedArg1);
      assert.equal(firsCall.args[ARG_DATA], data);
    });

    it('handles more than 1 template', () => {
      const passedArg1 = 'foo';
      const secondCallArg1 = 'bar';
      const secondCallArg2 = 'bar2';
      const data = {};
      const copyOptions = {};

      gen.renderTemplates(
        [
          { source: passedArg1 },
          {
            source: secondCallArg1,
            destination: secondCallArg2,
            copyOptions,
          },
        ],
        data,
      );

      const { copyTpl } = gen.fs;
      assert.equal(copyTpl.callCount, 2);

      const firsCall = copyTpl.getCall(0);
      assert.equal(firsCall.args[ARG_FROM], passedArg1);
      assert.equal(firsCall.args[ARG_TO], passedArg1);
      assert.equal(firsCall.args[ARG_DATA], data);

      const secondCall = copyTpl.getCall(1);
      assert.equal(secondCall.args[ARG_FROM], secondCallArg1);
      assert.equal(secondCall.args[ARG_TO], secondCallArg2);
      assert.equal(secondCall.args[ARG_DATA], data);
      expect(secondCall.args[ARG_COPYSETTINGS]).toMatchObject({ ...copyOptions, fromBasePath: expect.any(String) });
    });

    it('skips templates based on when callback', () => {
      const passedArg1 = 'foo';
      const secondCallArg1 = 'bar';
      const secondCallArg2 = 'bar2';
      const data = {};
      const copyOptions = {};

      gen.renderTemplates(
        [
          { source: passedArg1 },
          {
            source: secondCallArg1,
            when: () => false,
            destination: secondCallArg2,
            copyOptions,
          },
        ],
        data,
      );

      const { copyTpl } = gen.fs;
      assert.equal(copyTpl.callCount, 1);

      const firsCall = copyTpl.getCall(0);
      assert.equal(firsCall.args[ARG_FROM], passedArg1);
      assert.equal(firsCall.args[ARG_TO], passedArg1);
      assert.equal(firsCall.args[ARG_DATA], data);
    });

    it('passes the data to when callback', () => {
      const passedArg1 = 'foo';
      const templateData: TemplateData = {};
      let receivedData: TemplateData = { name: 'original value' }; // Set this to something so TypeScript doesn't complain that it is used before set

      gen.renderTemplates(
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

      const { copyTpl } = gen.fs;
      assert.equal(copyTpl.callCount, 0);

      assert.equal(receivedData, templateData);
    });
  });

  describe('#renderTemplatesAsync', () => {
    beforeEach(() => {
      sinonStub(gen, 'sourceRoot').returns('');
      sinonStub(gen, 'destinationRoot').returns('');

      for (const op of ['copyTplAsync']) {
        const returnValue = randomString();
        sinonStub(gen.fs, op).returns(returnValue);
        returns[op] = returnValue;
      }
    });

    afterEach(() => {
      gen.sourceRoot.restore();
      gen.destinationRoot.restore();
      for (const op of ['copyTplAsync']) gen.fs[op].restore();
    });

    it('handles 1 template', () => {
      const passedArg1 = 'foo';
      const data = {};
      gen.renderTemplatesAsync([{ source: passedArg1 }], data);

      const { copyTplAsync } = gen.fs;
      assert.equal(copyTplAsync.callCount, 1);

      const firsCall = copyTplAsync.getCall(0);
      assert.equal(firsCall.args[ARG_FROM], passedArg1);
      assert.equal(firsCall.args[ARG_TO], passedArg1);
      assert.equal(firsCall.args[ARG_DATA], data);
    });

    it('handles more than 1 template', () => {
      const passedArg1 = 'foo';
      const secondCallArg1 = 'bar';
      const secondCallArg2 = 'bar2';
      const data = {};
      const copyOptions = {};

      gen.renderTemplatesAsync(
        [
          { source: passedArg1 },
          {
            source: secondCallArg1,
            destination: secondCallArg2,
            copyOptions,
          },
        ],
        data,
      );

      const { copyTplAsync } = gen.fs;
      assert.equal(copyTplAsync.callCount, 2);

      const firsCall = copyTplAsync.getCall(0);
      assert.equal(firsCall.args[ARG_FROM], passedArg1);
      assert.equal(firsCall.args[ARG_TO], passedArg1);
      assert.equal(firsCall.args[ARG_DATA], data);

      const secondCall = copyTplAsync.getCall(1);
      assert.equal(secondCall.args[ARG_FROM], secondCallArg1);
      assert.equal(secondCall.args[ARG_TO], secondCallArg2);
      assert.equal(secondCall.args[ARG_DATA], data);
      expect(secondCall.args[ARG_COPYSETTINGS]).toMatchObject({ ...copyOptions, fromBasePath: expect.any(String) });
    });

    it('skips templates based on when callback', async () => {
      const passedArg1 = 'foo';
      const secondCallArg1 = 'bar';
      const secondCallArg2 = 'bar2';
      const data = {};
      const copyOptions = {};

      await gen.renderTemplatesAsync(
        [
          { source: passedArg1 },
          {
            source: secondCallArg1,
            when: () => false,
            destination: secondCallArg2,
            copyOptions,
          },
        ],
        data,
      );

      const { copyTplAsync } = gen.fs;
      assert.equal(copyTplAsync.callCount, 1);

      const firsCall = copyTplAsync.getCall(0);
      assert.equal(firsCall.args[ARG_FROM], passedArg1);
      assert.equal(firsCall.args[ARG_TO], passedArg1);
      assert.equal(firsCall.args[ARG_DATA], data);
    });

    it('passes the data to when callback', () => {
      const passedArg1 = 'foo';
      const templateData: TemplateData = {};
      let receivedData: TemplateData = { name: 'original value' }; // Set this to something so TypeScript doesn't complain that it is used before set

      gen.renderTemplatesAsync(
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

      const { copyTplAsync } = gen.fs;
      assert.equal(copyTplAsync.callCount, 0);

      assert.equal(receivedData, templateData);
    });
  });
});
