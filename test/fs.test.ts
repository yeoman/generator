import path from 'node:path';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { TestAdapter } from '@yeoman/adapter/testing';
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

const fsOperations = [
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
] as const;

type FSOpResult = {
  name:
    | 'readTemplate'
    | 'copyTemplate'
    | 'copyTemplateAsync'
    | 'readDestination'
    | 'writeDestination'
    | 'writeDestinationJSON'
    | 'deleteDestination'
    | 'copyDestination'
    | 'moveDestination'
    | 'existsDestination'
    | 'renderTemplate'
    | 'renderTemplateAsync';
  first?: 'templatePath' | 'destinationPath';
  second?: 'templatePath' | 'destinationPath';
  fromBasePath?: 'templatePath' | 'destinationPath';
  dest: (typeof fsOperations)[number];
  returnsUndefined?: boolean;
};

const testResults: FSOpResult[] = [
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
    first: 'destinationPath',
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
  let returns: Record<string, string>;
  let gen: Base;
  let base: BaseGenerator;

  beforeAll(() => {
    gen = new Base({ env: createEnv(), resolved: 'unknown', help: true });
  }, 10_000);

  beforeEach(() => {
    returns = {};
    base = new BaseGenerator([], { namespace: 'foo', help: true, resolved: 'unknown' });

    // Why not use a sinonStub for base.config as is done in #renderTemplate and #renderTemplateAsync below?
    //  base get config is not being tested in any way below.
    // @ts-expect-error Config is a string (not a symbol) and we know it exists on base  https://github.com/DefinitelyTyped/DefinitelyTyped/issues/33173
    vi.spyOn(base, 'config', 'get').mockReturnValue({
      getAll() {
        return configGetAll;
      },
    });

    Object.assign(base, {
      templatePath: vi.fn().mockReturnValue(baseReturns.templatePath),
      destinationPath: vi.fn().mockReturnValue(baseReturns.destinationPath),
      renderTemplate: Base.prototype.renderTemplate,
      renderTemplateAsync: Base.prototype.renderTemplateAsync,
      renderTemplates: Base.prototype.renderTemplates,
      renderTemplatesAsync: Base.prototype.renderTemplatesAsync,
      checkEnvironmentVersion() {},
      fs: {},
    });
    for (const op of fsOperations) {
      const returnValue = randomString();
      base.fs[op] = vi.fn().mockReturnValue(returnValue);
      returns[op] = returnValue;
    }
  });

  for (const operation of testResults) {
    const passedArg1 = randomString();
    const passedArg2 = randomString();
    // A plain object in writeDestinationJSON's replacer position selects its options form, so pass an array replacer.
    const passedArg3 = operation.name === 'writeDestinationJSON' ? ['key'] : {};
    const passedArg4 = { foo: 'bar' };

    describe(`#${operation.name as string}`, () => {
      let returnValue: string | undefined;
      let expectedReturn: string | undefined;
      let firstArgumentHandler: ReturnType<typeof vi.fn> | undefined;
      let secondArgumentHandler: ReturnType<typeof vi.fn>;

      beforeEach(async () => {
        returnValue = await (base[operation.name] as any)(passedArg1, passedArg2, passedArg3, passedArg4);

        expectedReturn = operation.returnsUndefined ? undefined : returns[operation.dest];
        firstArgumentHandler = operation.first ? (base[operation.first] as ReturnType<typeof vi.fn>) : undefined;
        if (operation.second !== undefined && operation.second !== null) {
          secondArgumentHandler = base[operation.second] as ReturnType<typeof vi.fn>;
        }
      });

      it('exists on the generator', () => {
        expect(operation.name in Base.prototype).toBeTruthy();
      });

      it('returns the correct value', () => {
        expect(returnValue).toBe(expectedReturn);
      });

      it('handles the first parameter', () => {
        if (firstArgumentHandler) {
          expect(firstArgumentHandler.mock.calls[0][0]).toBe(passedArg1);
        }
      });

      it.skip('handles the second parameter', () => {
        if (operation.second && operation.first === operation.second) {
          expect(secondArgumentHandler).toHaveBeenCalledTimes(2);
          expect(secondArgumentHandler.mock.calls[1][0]).toMatch(passedArg2);
        } else if (operation.second) {
          expect(secondArgumentHandler).toHaveBeenCalledOnce();
          expect(secondArgumentHandler.mock.calls[0][0]).toMatch(passedArg2);
          if (firstArgumentHandler) {
            expect(firstArgumentHandler).toHaveBeenCalledOnce();
          }
        }
      });

      it('calls fs with correct arguments', () => {
        const destCall = base.fs[operation.dest] as ReturnType<typeof vi.fn>;
        expect(destCall).toHaveBeenCalledOnce();
        const [call] = destCall.mock.calls;
        // First argument should be the trated first arguments
        expect(call[0]).toMatch(operation.first ? baseReturns[operation.first] : passedArg1);

        // Second argument should be the trated first arguments
        if (operation.second) {
          expect(call[1]).toMatch(baseReturns[operation.second]);
        } else {
          expect(call[1]).toMatch(passedArg2);
        }

        if (operation.dest === 'copy' || operation.dest === 'move') {
          expect(call[2]).toMatchObject(passedArg3);
        } else {
          expect(call[2]).toMatchObject(passedArg3);
        }
        expect(call[3].foo).toMatch(passedArg4.foo);
        if (operation.fromBasePath) {
          expect(call[2].fromBasePath).toMatch(baseReturns[operation.fromBasePath]);
        }
      });
    });
  }

  describe('#editorMetadata', () => {
    const editorMetadata = { foo: 'bar' };
    const metadataArgument: Record<string, number> = {
      copyTemplate: 2,
      copyTemplateAsync: 2,
      copyDestination: 2,
      writeDestination: 2,
      writeDestinationJSON: 4,
      renderTemplate: 3,
      renderTemplateAsync: 3,
    };

    it('is undefined by default', () => {
      expect(
        new BaseGenerator([], { namespace: 'foo', help: true, resolved: 'unknown' }).editorMetadata,
      ).toBeUndefined();
    });

    describe('when not set', () => {
      for (const [name, position] of Object.entries(metadataArgument)) {
        it(`${name} passes no metadata`, async () => {
          const op = testResults.find(result => result.name === name)!;
          await (base[op.name] as any)('from', 'to', {}, {});
          const [call] = (base.fs[op.dest] as ReturnType<typeof vi.fn>).mock.calls;
          expect(call[position]?.metadata).toBeUndefined();
        });
      }
    });

    describe('when set', () => {
      beforeEach(() => {
        vi.spyOn(base, 'editorMetadata', 'get').mockReturnValue(editorMetadata);
      });

      for (const [name, position] of Object.entries(metadataArgument)) {
        it(`${name} passes the metadata`, async () => {
          const op = testResults.find(result => result.name === name)!;
          await (base[op.name] as any)('from', 'to', {}, {});
          const [call] = (base.fs[op.dest] as ReturnType<typeof vi.fn>).mock.calls;
          expect(call[position].metadata).toEqual(editorMetadata);
        });
      }

      it('writeDestination merges explicit metadata over the generator metadata', () => {
        base.writeDestination('file.txt', 'content', { metadata: { foo: 'baz', other: true } });
        const [call] = (base.fs.write as ReturnType<typeof vi.fn>).mock.calls;
        expect(call[2].metadata).toEqual({ foo: 'baz', other: true });
      });

      it('renderTemplate merges explicit metadata over the generator metadata', () => {
        base.renderTemplate('from', 'to', {}, { metadata: { other: true } });
        const [call] = (base.fs.copyTpl as ReturnType<typeof vi.fn>).mock.calls;
        expect(call[3].metadata).toEqual({ foo: 'bar', other: true });
        expect(call[3].transformOptions.context).toBe(base);
      });
    });
  });

  describe('#allowOutsideRoot', () => {
    // [helper name, argument index of the options object, mem-fs argument index of the forwarded options]
    const optionsArgument: Array<[name: string, position: number, destPosition: number]> = [
      ['copyTemplate', 2, 2],
      ['copyTemplateAsync', 2, 2],
      ['copyDestination', 2, 2],
      ['moveDestination', 2, 2],
      ['writeDestination', 2, 2],
      ['writeDestinationJSON', 4, 4],
      ['deleteDestination', 1, 1],
      ['renderTemplate', 3, 3],
      ['renderTemplateAsync', 3, 3],
    ];

    for (const [name, position, destPosition] of optionsArgument) {
      it(`${name} passes allowOutsideRoot to path methods and strips it from fs options`, async () => {
        const op = testResults.find(result => result.name === name)!;
        // A plain object in writeDestinationJSON's replacer position selects its options form, so pass a null replacer.
        const args: unknown[] = name === 'writeDestinationJSON' ? ['from', 'to', null, 2] : ['from', 'to', {}, {}];
        args[position] = { allowOutsideRoot: true, foo: 'bar' };
        await (base[op.name] as any)(...args);

        for (const pathMethod of new Set([op.first, op.second].filter(Boolean))) {
          const handler = base[pathMethod!] as ReturnType<typeof vi.fn>;
          const pathCalls = handler.mock.calls.filter(call => call.length > 0);
          expect(pathCalls.length).toBeGreaterThan(0);
          for (const call of pathCalls) {
            expect(call.at(-1)).toEqual({ allowOutsideRoot: true });
          }
        }

        const [call] = (base.fs[op.dest] as ReturnType<typeof vi.fn>).mock.calls;
        expect(call[destPosition]).not.toHaveProperty('allowOutsideRoot');
        expect(call[destPosition].foo).toBe('bar');
      });
    }

    for (const name of ['readTemplate', 'readDestination'] as const) {
      it(`${name} passes allowOutsideRoot to the path method and strips it from read options`, () => {
        const op = testResults.find(result => result.name === name)!;
        base[name]('file', { allowOutsideRoot: true, defaults: 'x' });
        const [pathCall] = (base[op.first!] as ReturnType<typeof vi.fn>).mock.calls;
        expect(pathCall).toEqual(['file', { allowOutsideRoot: true }]);
        const [call] = (base.fs.read as ReturnType<typeof vi.fn>).mock.calls;
        expect(call[1]).toEqual({ defaults: 'x' });
      });
    }

    it('readDestinationJSON passes allowOutsideRoot to destinationPath', () => {
      base.fs.readJSON = vi.fn();
      base.readDestinationJSON('file', undefined, { allowOutsideRoot: true });
      const [pathCall] = (base.destinationPath as ReturnType<typeof vi.fn>).mock.calls;
      expect(pathCall).toEqual(['file', { allowOutsideRoot: true }]);
    });

    it('existsDestination passes allowOutsideRoot to destinationPath', () => {
      base.existsDestination('file', { allowOutsideRoot: true });
      const [pathCall] = (base.destinationPath as ReturnType<typeof vi.fn>).mock.calls;
      expect(pathCall).toEqual(['file', { allowOutsideRoot: true }]);
    });

    it('writeDestinationJSON accepts replacer and space inside options', () => {
      const replacer = ['a'];
      base.writeDestinationJSON('file', { a: 1 }, { replacer, space: 4, allowOutsideRoot: true, metadata: { foo: 'bar' } });
      const [pathCall] = (base.destinationPath as ReturnType<typeof vi.fn>).mock.calls;
      expect(pathCall).toEqual(['file', { allowOutsideRoot: true }]);
      const [call] = (base.fs.writeJSON as ReturnType<typeof vi.fn>).mock.calls;
      expect(call.slice(1)).toEqual([{ a: 1 }, replacer, 4, { metadata: { foo: 'bar' } }]);
    });

    it('writeDestinationJSON keeps null, array and function replacers positional', () => {
      const fn = (_key: string, value: unknown) => value;
      for (const replacer of [null, ['a'], fn]) {
        base.writeDestinationJSON('file', { a: 1 }, replacer as any, 2, { allowOutsideRoot: true });
        const call = (base.fs.writeJSON as ReturnType<typeof vi.fn>).mock.calls.at(-1)!;
        expect(call.slice(2)).toEqual([replacer, 2, {}]);
      }
    });

    it('writeDestination keeps the deprecated stat argument untouched', () => {
      const stat = { isFile: () => true };
      base.writeDestination('file', 'content', stat as any);
      const [call] = (base.fs.write as ReturnType<typeof vi.fn>).mock.calls;
      expect(call[2]).toBe(stat);
    });

    it('renderTemplates forwards allowOutsideRoot from template copyOptions', () => {
      base.renderTemplates([{ source: 'from', destination: 'to', copyOptions: { allowOutsideRoot: true } }], {});
      const templateCalls = (base.templatePath as ReturnType<typeof vi.fn>).mock.calls.filter(call => call.length > 0);
      expect(templateCalls).toEqual([['from', { allowOutsideRoot: true }]]);
      const [call] = (base.fs.copyTpl as ReturnType<typeof vi.fn>).mock.calls;
      expect(call[3]).not.toHaveProperty('allowOutsideRoot');
    });
  });

  describe('#renderTemplate', () => {
    const getAllReturn = {};
    const getPathReturn = { foo: 'bar' };

    beforeEach(() => {
      vi.spyOn(gen, 'sourceRoot').mockReturnValue('');
      vi.spyOn(gen, 'destinationRoot').mockReturnValue('');
      vi.spyOn(gen.config, 'getAll').mockReturnValue(getAllReturn);
      vi.spyOn(gen.config, 'getPath').mockReturnValue(getPathReturn);

      for (const op of ['copyTpl'] as const) {
        const returnValue = randomString();
        // @ts-expect-error testing only
        vi.spyOn(gen.fs, op).mockReturnValue(returnValue);
        returns[op] = returnValue;
      }
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('gets default data from config', () => {
      gen.renderTemplate('a', 'b');
      const { copyTpl } = gen.fs;

      expect(copyTpl).toHaveBeenCalledOnce();
      const [firsCall] = (copyTpl as ReturnType<typeof vi.fn>).mock.calls;
      expect(firsCall[ARG_DATA]).toBe(getAllReturn);
    });

    it('gets data with path from config', () => {
      gen.renderTemplate('a', 'b', 'test');
      const { copyTpl } = gen.fs;

      expect(copyTpl).toHaveBeenCalledOnce();
      const [firsCall] = (copyTpl as ReturnType<typeof vi.fn>).mock.calls;
      expect(firsCall[ARG_DATA]).toBe(getPathReturn);
    });

    it('concatenates source and destination', () => {
      const source = ['a', 'b'];
      const destination = ['b', 'a'];
      const data = {};

      gen.renderTemplate(source, destination, data);
      const { copyTpl } = gen.fs;

      expect(copyTpl).toHaveBeenCalledOnce();
      const [firsCall] = (copyTpl as ReturnType<typeof vi.fn>).mock.calls;
      expect(firsCall[ARG_FROM]).toBe(path.join(...source));
      expect(firsCall[ARG_TO]).toBe(path.join(...destination));
      expect(firsCall[ARG_DATA]).toBe(data);
    });
  });

  describe('#renderTemplateAsync', () => {
    const getAllReturn = {};
    const getPathReturn = { foo: 'bar' };

    beforeEach(() => {
      vi.spyOn(gen, 'sourceRoot').mockReturnValue('');
      vi.spyOn(gen, 'destinationRoot').mockReturnValue('');
      vi.spyOn(gen.config, 'getAll').mockReturnValue(getAllReturn);
      vi.spyOn(gen.config, 'getPath').mockReturnValue(getPathReturn);

      for (const op of ['copyTplAsync'] as const) {
        const returnValue = randomString();
        // @ts-expect-error testing only
        vi.spyOn(gen.fs, op).mockReturnValue(returnValue);
        returns[op] = returnValue;
      }
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('gets default data from config', () => {
      gen.renderTemplateAsync('a', 'b');
      const { copyTplAsync } = gen.fs;

      expect(copyTplAsync).toHaveBeenCalledOnce();
      const [firsCall] = (copyTplAsync as ReturnType<typeof vi.fn>).mock.calls;
      expect(firsCall[ARG_DATA]).toBe(getAllReturn);
    });

    it('gets data with path from config', async () => {
      await gen.renderTemplateAsync('a', 'b', 'test');
      const { copyTplAsync } = gen.fs;

      expect(copyTplAsync).toHaveBeenCalledOnce();
      const [firsCall] = (copyTplAsync as ReturnType<typeof vi.fn>).mock.calls;
      expect(firsCall[ARG_DATA]).toBe(getPathReturn);
    });

    it('concatenates source and destination', () => {
      const source = ['a', 'b'];
      const destination = ['b', 'a'];
      const data = {};

      gen.renderTemplateAsync(source, destination, data);
      const { copyTplAsync } = gen.fs;

      expect(copyTplAsync).toHaveBeenCalledOnce();
      const [firsCall] = (copyTplAsync as ReturnType<typeof vi.fn>).mock.calls;
      expect(firsCall[ARG_FROM]).toBe(path.join(...source));
      expect(firsCall[ARG_TO]).toBe(path.join(...destination));
      expect(firsCall[ARG_DATA]).toBe(data);
    });
  });

  describe('#renderTemplates', () => {
    beforeEach(() => {
      vi.spyOn(gen, 'sourceRoot').mockReturnValue('');
      vi.spyOn(gen, 'destinationRoot').mockReturnValue('');

      for (const op of ['copyTpl'] as const) {
        const returnValue = randomString();
        // @ts-expect-error testing only
        vi.spyOn(gen.fs, op).mockReturnValue(returnValue);
        returns[op] = returnValue;
      }
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('handles 1 template', () => {
      const passedArg1 = 'foo';
      const data = {};
      gen.renderTemplates([{ source: passedArg1 }], data);

      const { copyTpl } = gen.fs;
      expect(copyTpl).toHaveBeenCalledTimes(1);

      const [firsCall] = (copyTpl as ReturnType<typeof vi.fn>).mock.calls;
      expect(firsCall[ARG_FROM]).toBe(passedArg1);
      expect(firsCall[ARG_TO]).toBe(passedArg1);
      expect(firsCall[ARG_DATA]).toBe(data);
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
      expect(copyTpl).toHaveBeenCalledTimes(2);

      const [firsCall] = (copyTpl as ReturnType<typeof vi.fn>).mock.calls;
      expect(firsCall[ARG_FROM]).toBe(passedArg1);
      expect(firsCall[ARG_TO]).toBe(passedArg1);
      expect(firsCall[ARG_DATA]).toBe(data);

      const [, secondCall] = (copyTpl as ReturnType<typeof vi.fn>).mock.calls;
      expect(secondCall[ARG_FROM]).toBe(secondCallArg1);
      expect(secondCall[ARG_TO]).toBe(secondCallArg2);
      expect(secondCall[ARG_DATA]).toBe(data);
      expect(secondCall[ARG_COPYSETTINGS]).toMatchObject({ ...copyOptions, fromBasePath: expect.any(String) });
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
      expect(copyTpl).toHaveBeenCalledTimes(1);

      const [firsCall] = (copyTpl as ReturnType<typeof vi.fn>).mock.calls;
      expect(firsCall[ARG_FROM]).toBe(passedArg1);
      expect(firsCall[ARG_TO]).toBe(passedArg1);
      expect(firsCall[ARG_DATA]).toBe(data);
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
              return false;
            },
          },
        ],
        templateData,
      );

      const { copyTpl } = gen.fs;
      expect(copyTpl).toHaveBeenCalledTimes(0);

      expect(receivedData).toBe(templateData);
    });
  });

  describe('#renderTemplatesAsync', () => {
    beforeEach(() => {
      vi.spyOn(gen, 'sourceRoot').mockReturnValue('');
      vi.spyOn(gen, 'destinationRoot').mockReturnValue('');

      for (const op of ['copyTplAsync'] as const) {
        const returnValue = randomString();
        // @ts-expect-error testing only
        vi.spyOn(gen.fs, op).mockReturnValue(returnValue);
        returns[op] = returnValue;
      }
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('handles 1 template', () => {
      const passedArg1 = 'foo';
      const data = {};
      gen.renderTemplatesAsync([{ source: passedArg1 }], data);

      const { copyTplAsync } = gen.fs;
      expect(copyTplAsync).toHaveBeenCalledTimes(1);

      const [firsCall] = (copyTplAsync as ReturnType<typeof vi.fn>).mock.calls;
      expect(firsCall[ARG_FROM]).toBe(passedArg1);
      expect(firsCall[ARG_TO]).toBe(passedArg1);
      expect(firsCall[ARG_DATA]).toBe(data);
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
      expect(copyTplAsync).toHaveBeenCalledTimes(2);

      const [firsCall] = (copyTplAsync as ReturnType<typeof vi.fn>).mock.calls;
      expect(firsCall[ARG_FROM]).toBe(passedArg1);
      expect(firsCall[ARG_TO]).toBe(passedArg1);
      expect(firsCall[ARG_DATA]).toBe(data);

      const [, secondCall] = (copyTplAsync as ReturnType<typeof vi.fn>).mock.calls;
      expect(secondCall[ARG_FROM]).toBe(secondCallArg1);
      expect(secondCall[ARG_TO]).toBe(secondCallArg2);
      expect(secondCall[ARG_DATA]).toBe(data);
      expect(secondCall[ARG_COPYSETTINGS]).toMatchObject({ ...copyOptions, fromBasePath: expect.any(String) });
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
      expect(copyTplAsync).toHaveBeenCalledTimes(1);

      const [firsCall] = (copyTplAsync as ReturnType<typeof vi.fn>).mock.calls;
      expect(firsCall[ARG_FROM]).toBe(passedArg1);
      expect(firsCall[ARG_TO]).toBe(passedArg1);
      expect(firsCall[ARG_DATA]).toBe(data);
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
              return false;
            },
          },
        ],
        templateData,
      );

      const { copyTplAsync } = gen.fs;
      expect(copyTplAsync).toHaveBeenCalledTimes(0);

      expect(receivedData).toBe(templateData);
    });
  });
  describe('#moveDestination (source deletion)', () => {
    it('deletes the source relative to the destination root', () => {
      const generator = new Base({ env: createEnv(), resolved: 'unknown', help: true });
      const destinationRoot = path.join(process.cwd(), `move-destination-${randomString()}`);
      const destinationRootStub = vi.spyOn(generator, 'destinationRoot').mockReturnValue(destinationRoot);

      try {
        generator.writeDestination('a.txt', 'foo');
        generator.moveDestination('a.txt', 'b.txt');

        expect(generator.readDestination('b.txt')).toBe('foo');
        expect(generator.existsDestination('a.txt')).toBe(false);
      } finally {
        destinationRootStub.mockRestore();
      }
    });
  });
});
