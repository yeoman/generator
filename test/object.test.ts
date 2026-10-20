import { describe, expect, it } from 'vitest';
// The helpers are checked against lodash, which they replace.
/* eslint-disable unicorn/prefer-structured-clone */
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import * as lodash from 'lodash-es';
import { cloneDeep, defaults, get, merge, set } from '../src/util/object.js';

const createObject = () => ({
  a: { b: [{ c: 1 }, { d: [2, 3] }], 'e.f': 'dotted', "g'h": 'quoted' },
  'a.b': 'literal',
  ':app': { '#one': { value: 'instance' } },
  gen: { ':app': { '#one': 'nested' } },
  list: [0, [1, [2]]],
  empty: '',
  zero: 0,
  nullValue: null,
  undefinedValue: undefined,
  '': 'empty key',
});

const paths: Array<string | number | string[]> = [
  'a',
  'a.b',
  'a.b[0].c',
  'a.b[1].d[1]',
  'a["e.f"]',
  "a['e.f']",
  String.raw`a["g'h"]`,
  'a.b',
  ':app',
  ':app.#one.value',
  'gen.:app.#one',
  'gen[":app"]["#one"]',
  'list[1][1][0]',
  'list.1.1.0',
  '.a',
  'a..b',
  '',
  '[]',
  'a[-1]',
  'missing',
  'missing.deep[0].path',
  'nullValue.x',
  'undefinedValue.x',
  'zero',
  'empty',
  ['a', 'b', '0', 'c'],
  ['a.b'],
  0,
];

describe('object helpers', () => {
  describe('get()', () => {
    for (const path of paths) {
      it(`gets ${JSON.stringify(path)} like lodash`, () => {
        expect(get(createObject(), path)).toEqual(lodash.get(createObject(), path));
      });
    }

    it('gets from nullish objects like lodash', () => {
      expect(get(undefined, 'a.b')).toEqual(lodash.get(undefined, 'a.b'));
      expect(get(null, 'a')).toEqual(lodash.get(null, 'a'));
    });
  });

  describe('set()', () => {
    for (const path of [...paths, 'new.deep[0].path', 'new[0][1]', 'zero.x', 'a.b[5].x', 'list[1][3]']) {
      it(`sets ${JSON.stringify(path)} like lodash`, () => {
        expect(set(createObject(), path, 'value')).toEqual(lodash.set(createObject(), path, 'value'));
      });
    }

    for (const path of [
      '__proto__.polluted',
      'constructor.prototype.polluted',
      'a.__proto__.polluted',
      ['__proto__', 'polluted'],
    ]) {
      it(`does not set ${JSON.stringify(path)}, like lodash`, () => {
        const object = createObject();
        set(object, path, true);
        expect(object).toEqual(lodash.set(createObject(), path, true));
        expect(({} as any).polluted).toBeUndefined();
      });
    }

    it('returns a value that is not an object, like lodash', () => {
      expect(set('string' as any, 'a', 1)).toEqual(lodash.set('string' as any, 'a', 1));
    });
  });

  describe('defaults()', () => {
    it('assigns the undefined properties like lodash', () => {
      const sources = [{ a: 'first', b: 'first', c: 'first', d: 'first' }, undefined, { d: 'second', e: 'second' }];
      const target = () => ({ a: 'target', b: undefined, c: null });
      expect(defaults(target(), ...sources)).toEqual(lodash.defaults(target(), ...sources));
    });

    it('assigns the inherited properties of a source like lodash', () => {
      const source = Object.assign(Object.create({ inherited: 1 }), { own: 2 });
      expect(defaults({}, source)).toEqual(lodash.defaults({}, source));
    });
  });

  describe('merge()', () => {
    const cases: Array<[string, () => object, () => object[]]> = [
      ['nested objects', () => ({ a: { b: 1, c: { d: 2 } } }), () => [{ a: { c: { e: 3 }, f: 4 } }]],
      [
        'arrays by index',
        () => ({ list: [1, 2, 3], objects: [{ a: 1 }, { b: 2 }] }),
        () => [{ list: [9], objects: [{ c: 3 }] }],
      ],
      ['undefined values', () => ({ a: 1, b: { c: 2 } }), () => [{ a: undefined, b: { c: undefined }, d: undefined }]],
      ['null values', () => ({ a: { b: 1 }, c: null }), () => [{ a: null, c: { d: 1 } }]],
      [
        'an array into an object and an object into an array',
        () => ({ a: { b: 1 }, c: [1, 2] }),
        () => [{ a: [9], c: { 1: 'x' } }],
      ],
      ['primitives replacing objects', () => ({ a: { b: 1 }, c: 'text' }), () => [{ a: 'replaced', c: { d: 1 } }]],
      [
        'several sources',
        () => ({ a: { b: 1 } }),
        () => [{ a: { c: 2 } }, { a: { b: 3, d: [1] } }, { a: { d: [undefined, 2] } }],
      ],
      ['the store merge', () => ({}), () => [createObject(), { a: { b: [{ x: 1 }] }, ':app': { '#two': {} } }]],
    ];
    for (const [name, target, sources] of cases) {
      it(`merges ${name} like lodash`, () => {
        expect(merge(target(), ...sources())).toEqual(lodash.merge(target(), ...sources()));
      });
    }

    it('assigns the objects that are not plain, like lodash', () => {
      const date = new Date(0);
      expect(merge({}, { date }).date).toBe(lodash.merge({}, { date }).date);
    });

    it('merges into the target and does not change the sources', () => {
      const target = {};
      const source = { a: { b: [1] } };
      const result = merge(target, source);
      expect(result).toBe(target);
      expect(result.a).not.toBe(source.a);
      expect(result.a.b).not.toBe(source.a.b);
    });
  });

  describe('cloneDeep()', () => {
    it('copies the arrays and plain objects like lodash', () => {
      const value = createObject();
      const copy = cloneDeep(value);
      expect(copy).toEqual(lodash.cloneDeep(value));
      expect(copy).not.toBe(value);
      expect(copy.a.b).not.toBe(value.a.b);
      expect(copy.a.b[1]).not.toBe(value.a.b[1]);
      expect(copy[':app']).not.toBe(value[':app']);
    });

    it('copies the primitives like lodash', () => {
      for (const value of ['text', 1, true, null, undefined]) {
        expect(cloneDeep(value)).toEqual(lodash.cloneDeep(value));
      }
    });
  });
});
