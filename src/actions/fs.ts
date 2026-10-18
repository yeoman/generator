/* eslint max-params: [1, 6] */
import assert from 'node:assert';
import chalk from 'chalk';
import { type MemFsEditor } from 'mem-fs-editor';
import type { BaseGenerator } from '../generator.js';
import type { PathOptions } from '../types.js';
import { splitPathOptions } from '../util/path-options.js';

type CopyOptions = NonNullable<Parameters<MemFsEditor['copy']>[2]>;
type CopyAsyncOptions = NonNullable<Parameters<MemFsEditor['copyAsync']>[2]>;
type WriteOptions = NonNullable<Parameters<MemFsEditor['write']>[2]>;
type WriteJSONParameters = Parameters<MemFsEditor['writeJSON']>;
type WriteJSONReplacer = WriteJSONParameters[2];
type WriteJSONSpace = WriteJSONParameters[3];
type WriteJSONOptions = WriteOptions & PathOptions & { replacer?: WriteJSONReplacer; space?: WriteJSONSpace };
type DeleteOptions = NonNullable<Parameters<MemFsEditor['delete']>[1]>;
/**
 * The context of a template rendered with the `templateContext` feature `'throw'`: reading a property of `this` throws.
 */
const createDisabledTemplateContext = (templatePath: string): object =>
  new Proxy(Object.create(null), {
    get(_target, property) {
      if (typeof property === 'symbol') {
        return;
      }

      throw new Error(
        `Template ${templatePath} reads this.${property}: the generator is not the context of its templates, pass it in the template data`,
      );
    },
  });

// The properties each generator warned a template reads from `this`, to warn once.
const warnedTemplateContexts = new WeakMap<object, Set<string>>();

/**
 * The context of a template rendered with the `templateContext` feature `'warn'`: the generator, warning once by
 * template and property read from `this`. A method keeps the generator as `this`, for its private fields.
 */
const createWarningTemplateContext = (generator: BaseGenerator, templatePath: string): object =>
  new Proxy(generator, {
    get(target, property) {
      const value = Reflect.get(target, property, target);
      if (typeof property !== 'symbol') {
        let warned = warnedTemplateContexts.get(target);
        if (!warned) {
          warned = new Set();
          warnedTemplateContexts.set(target, warned);
        }

        const key = `${templatePath}#${property}`;
        if (!warned.has(key)) {
          warned.add(key);
          const message = `${chalk.yellow('(!)')} Template ${templatePath} reads this.${property}: the generator will not be the context of its templates in the next major, pass it in the template data (the templateContext feature 'throw' renders without it)`;
          // A generator without an environment adapter has no log.
          if (typeof target.log === 'function') {
            target.log(message);
          } else {
            console.warn(message);
          }
        }
      }

      return typeof value === 'function' ? value.bind(target) : value;
    },
  });

/**
 * The context of a template, by the `templateContext` feature.
 */
const getTemplateContext = (generator: BaseGenerator, templatePath: string): object | undefined => {
  const { templateContext = 'warn' } = generator.features;
  switch (templateContext) {
    case 'generator': {
      return generator;
    }

    case 'throw': {
      return createDisabledTemplateContext(templatePath);
    }

    case 'none': {
      return undefined;
    }

    default: {
      return createWarningTemplateContext(generator, templatePath);
    }
  }
};

type CopyTplOptions = NonNullable<Parameters<MemFsEditor['copyTpl']>[3]>;
type CopyTplAsyncOptions = NonNullable<Parameters<MemFsEditor['copyTplAsync']>[3]>;

type ReadOptions = { raw?: boolean; defaults?: string | Buffer | null };

export type Template<G, C extends 'copyTplAsync' | 'copyTpl', D extends NonNullable<Parameters<MemFsEditor[C]>[2]>> = {
  /**
   * Template file, relative to templatePath(), or absolute inside the source root (outside when the `allowTemplatesOutsideRoot` feature is enabled, inside the generator package when the `allowPackageTemplates` feature is enabled).
   */
  source: string;
  /**
   * Conditional if the template should be written.
   * @param TemplateData
   * @param Generator
   * @returns
   */
  when?: (data: D, generator: G) => boolean;
  /**
   * Destination, relative to destinationPath(), or absolute inside the destination root (outside when the `allowDestinationOutsideRoot` feature is enabled).
   */
  destination?: string;
  /**
   * Mem-fs-editor copy options, `allowOutsideRoot` applies to both source and destination.
   */
  copyOptions?: NonNullable<Parameters<MemFsEditor[C]>[3]> & PathOptions;
  /**
   * Ejs data
   */
  templateData?: string | D;
};

export type Templates<
  G,
  C extends 'copyTplAsync' | 'copyTpl',
  D extends NonNullable<Parameters<MemFsEditor[C]>[2]>,
> = Array<Template<G, C, D>>;

/**
 * A replacer is a function, an array or null, so a plain object in its position is the options object.
 */
const isWriteJSONOptions = (value: WriteJSONReplacer | WriteJSONOptions): value is WriteJSONOptions =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const writeJSONOptionsToPositional = ({
  replacer,
  space,
  ...options
}: WriteJSONOptions): [WriteJSONReplacer?, WriteJSONSpace?, (WriteOptions & PathOptions)?] => [
  replacer,
  space,
  options,
];

type EditorMetadataOptions = { metadata?: Record<string, unknown> };

/**
 * Merge the generator's `editorMetadata` into mem-fs-editor options, an explicit `metadata` option takes precedence.
 */
function withEditorMetadata<T extends EditorMetadataOptions | undefined>(generator: BaseGenerator, options: T): T {
  const { editorMetadata } = generator;
  if (!editorMetadata) {
    return options;
  }

  if (options && 'isFile' in options) {
    // Deprecated `write(filepath, contents, stat)` signature.
    return { stat: options, metadata: editorMetadata } as unknown as T;
  }

  return { ...options, metadata: { ...editorMetadata, ...options?.metadata } } as T;
}

export class FsMixin {
  fs!: MemFsEditor;

  /**
   * Read file from templates folder.
   * mem-fs-editor method's shortcut, for more information see [mem-fs-editor]{@link https://github.com/SBoudrias/mem-fs-editor}.
   * Shortcut for this.fs!.read(this.templatePath(filepath))
   */
  readTemplate(this: BaseGenerator, filepath: string, options?: PathOptions): string;
  readTemplate<const DefaultType extends string | null>(
    this: BaseGenerator,
    filepath: string,
    options: { raw?: false; defaults: DefaultType } & PathOptions,
  ): string | DefaultType;
  readTemplate(this: BaseGenerator, filepath: string, options: { raw: true; defaults?: never } & PathOptions): Buffer;
  readTemplate<const DefaultType extends Buffer | null>(
    this: BaseGenerator,
    filepath: string,
    options: { raw: true; defaults: DefaultType } & PathOptions,
  ): Buffer | DefaultType;
  readTemplate(
    this: BaseGenerator,
    ...args: [filepath: string, options?: ReadOptions & PathOptions]
  ): string | Buffer | null {
    const [filepath, options, ...remaining] = args;
    const [pathOptions, readOptions] = splitPathOptions(options);

    return (this.fs.read as any)(this.templatePath(filepath, pathOptions), readOptions, ...remaining);
  }

  /**
   * Copy file from templates folder to destination folder.
   * mem-fs-editor method's shortcut, for more information see [mem-fs-editor]{@link https://github.com/SBoudrias/mem-fs-editor}.
   * Shortcut for this.fs!.copy(this.templatePath(from), this.destinationPath(to))
   */
  copyTemplate(
    this: BaseGenerator,
    ...args: [from: string | string[], to: string, options?: CopyOptions & PathOptions]
  ): ReturnType<MemFsEditor['copy']> {
    const [from, to, options, ...remaining] = args;
    const [pathOptions, copyOptions] = splitPathOptions(options);

    return this.fs.copy(
      from,
      this.destinationPath(to, pathOptions),
      withEditorMetadata(this, { fromBasePath: this.templatePath(), ...copyOptions }),
      ...remaining,
    );
  }

  /**
   * Copy file from templates folder to destination folder.
   * mem-fs-editor method's shortcut, for more information see [mem-fs-editor]{@link https://github.com/SBoudrias/mem-fs-editor}.
   * Shortcut for this.fs!.copy(this.templatePath(from), this.destinationPath(to))
   */
  async copyTemplateAsync(
    this: BaseGenerator,
    ...args: [from: string | string[], to: string, options?: CopyAsyncOptions & PathOptions]
  ): ReturnType<MemFsEditor['copyAsync']> {
    const [from, to, options, ...remaining] = args;
    const [pathOptions, copyOptions] = splitPathOptions(options);
    const templatePath = (filepath: string) => this.templatePath(filepath, pathOptions);

    return this.fs.copyAsync(
      Array.isArray(from) ? from.map(filepath => templatePath(filepath)) : templatePath(from),
      this.destinationPath(to, pathOptions),
      withEditorMetadata(this, copyOptions),
      ...remaining,
    );
  }

  /**
   * Read file from destination folder
   * mem-fs-editor method's shortcut, for more information see [mem-fs-editor]{@link https://github.com/SBoudrias/mem-fs-editor}.
   * Shortcut for this.fs!.read(this.destinationPath(filepath)).
   */
  readDestination(this: BaseGenerator, filepath: string, options?: PathOptions): string;
  readDestination<const DefaultType extends string | null>(
    this: BaseGenerator,
    filepath: string,
    options: { raw?: false; defaults: DefaultType } & PathOptions,
  ): string | DefaultType;
  readDestination(
    this: BaseGenerator,
    filepath: string,
    options: { raw: true; defaults?: never } & PathOptions,
  ): Buffer;
  readDestination<const DefaultType extends Buffer | null>(
    this: BaseGenerator,
    filepath: string,
    options: { raw: true; defaults: DefaultType } & PathOptions,
  ): Buffer | DefaultType;
  readDestination(
    this: BaseGenerator,
    ...args: [filepath: string, options?: ReadOptions & PathOptions]
  ): string | Buffer | null {
    const [filepath, options, ...remaining] = args;
    const [pathOptions, readOptions] = splitPathOptions(options);

    return (this.fs.read as any)(this.destinationPath(filepath, pathOptions), readOptions, ...remaining);
  }

  /**
   * Read JSON file from destination folder
   * mem-fs-editor method's shortcut, for more information see [mem-fs-editor]{@link https://github.com/SBoudrias/mem-fs-editor}.
   * Shortcut for this.fs!.readJSON(this.destinationPath(filepath)).
   */
  readDestinationJSON(
    this: BaseGenerator,
    filepath: string,
    defaults?: undefined,
    options?: PathOptions,
  ): object | undefined;
  readDestinationJSON<T>(this: BaseGenerator, filepath: string, defaults: T, options?: PathOptions): object | T;
  readDestinationJSON(
    this: BaseGenerator,
    ...args: [filepath: string, defaults?: unknown, options?: PathOptions]
  ): object | unknown {
    const [filepath, defaults, options, ...remaining] = args;

    return (this.fs.readJSON as any)(this.destinationPath(filepath, options ?? {}), defaults, options, ...remaining);
  }

  /**
   * Write file to destination folder
   * mem-fs-editor method's shortcut, for more information see [mem-fs-editor]{@link https://github.com/SBoudrias/mem-fs-editor}.
   * Shortcut for this.fs!.write(this.destinationPath(filepath)).
   */
  writeDestination(
    this: BaseGenerator,
    ...args: [filepath: string, contents: string | Buffer, options?: WriteOptions & PathOptions]
  ): ReturnType<MemFsEditor['write']> {
    const [filepath, contents, options, ...remaining] = args;
    const [pathOptions, writeOptions] = splitPathOptions(options);

    return this.fs.write(
      this.destinationPath(filepath, pathOptions),
      contents,
      withEditorMetadata(this, writeOptions),
      ...remaining,
    );
  }

  /**
   * Write json file to destination folder
   * mem-fs-editor method's shortcut, for more information see [mem-fs-editor]{@link https://github.com/SBoudrias/mem-fs-editor}.
   * Shortcut for this.fs!.writeJSON(this.destinationPath(filepath)).
   */
  writeDestinationJSON(
    this: BaseGenerator,
    filepath: string,
    contents: unknown,
    options?: WriteJSONOptions,
  ): ReturnType<MemFsEditor['writeJSON']>;
  writeDestinationJSON(
    this: BaseGenerator,
    filepath: string,
    contents: unknown,
    replacer?: WriteJSONReplacer,
    space?: WriteJSONSpace,
    options?: WriteOptions & PathOptions,
  ): ReturnType<MemFsEditor['writeJSON']>;
  writeDestinationJSON(
    this: BaseGenerator,
    ...args: [
      filepath: string,
      contents: unknown,
      replacerOrOptions?: WriteJSONReplacer | WriteJSONOptions,
      space?: WriteJSONSpace,
      options?: WriteOptions & PathOptions,
    ]
  ): ReturnType<MemFsEditor['writeJSON']> {
    const [filepath, contents, ...rest] = args;
    // Normalize the `writeDestinationJSON(filepath, contents, options)` form to the positional one.
    const [replacer, space, options, ...remaining] = isWriteJSONOptions(rest[0])
      ? writeJSONOptionsToPositional(rest[0])
      : (rest as [WriteJSONReplacer?, WriteJSONSpace?, (WriteOptions & PathOptions)?]);
    const [pathOptions, writeOptions] = splitPathOptions(options);

    return this.fs.writeJSON(
      this.destinationPath(filepath, pathOptions),
      contents,
      replacer,
      space,
      withEditorMetadata(this, writeOptions),
      ...remaining,
    );
  }

  /**
   * Delete file from destination folder
   * mem-fs-editor method's shortcut, for more information see [mem-fs-editor]{@link https://github.com/SBoudrias/mem-fs-editor}.
   * Shortcut for this.fs!.delete(this.destinationPath(filepath)).
   */
  deleteDestination(
    this: BaseGenerator,
    ...args: [paths: string | string[], options?: DeleteOptions & PathOptions]
  ): ReturnType<MemFsEditor['delete']> {
    const [paths, options, ...remaining] = args;
    const [pathOptions, deleteOptions] = splitPathOptions(options);
    const destinationPath = (filepath: string) => this.destinationPath(filepath, pathOptions);

    return this.fs.delete(
      Array.isArray(paths) ? paths.map(filepath => destinationPath(filepath)) : destinationPath(paths),
      deleteOptions,
      ...remaining,
    );
  }

  /**
   * Copy file from destination folder to another destination folder.
   * mem-fs-editor method's shortcut, for more information see [mem-fs-editor]{@link https://github.com/SBoudrias/mem-fs-editor}.
   * Shortcut for this.fs!.copy(this.destinationPath(from), this.destinationPath(to)).
   */
  copyDestination(
    this: BaseGenerator,
    ...args: [from: string | string[], to: string, options?: CopyOptions & PathOptions]
  ): ReturnType<MemFsEditor['copy']> {
    const [from, to, options, ...remaining] = args;
    const [pathOptions, copyOptions] = splitPathOptions(options);

    return this.fs.copy(
      from,
      this.destinationPath(to, pathOptions),
      withEditorMetadata(this, { fromBasePath: this.destinationPath(), ...copyOptions }),
      ...remaining,
    );
  }

  /**
   * Move file from destination folder to another destination folder.
   * mem-fs-editor method's shortcut, for more information see [mem-fs-editor]{@link https://github.com/SBoudrias/mem-fs-editor}.
   * Shortcut for this.fs!.move(this.destinationPath(from), this.destinationPath(to)).
   */
  moveDestination(
    this: BaseGenerator,
    ...args: [from: string, to: string, options?: CopyOptions & PathOptions]
  ): ReturnType<MemFsEditor['move']> {
    const [from, to, options, ...remaining] = args;
    const [pathOptions, moveOptions] = splitPathOptions(options);

    return this.fs.move(
      this.destinationPath(from, pathOptions),
      this.destinationPath(to, pathOptions),
      { fromBasePath: this.destinationPath(), ...moveOptions },
      ...remaining,
    );
  }

  /**
   * Exists file on destination folder.
   * mem-fs-editor method's shortcut, for more information see [mem-fs-editor]{@link https://github.com/SBoudrias/mem-fs-editor}.
   * Shortcut for this.fs!.exists(this.destinationPath(filepath)).
   */
  existsDestination(
    this: BaseGenerator,
    ...args: [filepath: string, options?: PathOptions]
  ): ReturnType<MemFsEditor['exists']> {
    const [filepath, options, ...remaining] = args;

    return (this.fs.exists as any)(this.destinationPath(filepath, options ?? {}), options, ...remaining);
  }

  /**
   * Copy a template from templates folder to the destination.
   *
   * @param source - template file, relative to templatePath(), or absolute inside the source root (outside when the `allowTemplatesOutsideRoot` feature is enabled, inside the generator package when the `allowPackageTemplates` feature is enabled).
   * @param destination - destination, relative to destinationPath(), or absolute inside the destination root (outside when the `allowDestinationOutsideRoot` feature is enabled).
   * @param templateData - ejs data
   * @param templateOptions - ejs options
   * @param copyOptions - mem-fs-editor copy options, `allowOutsideRoot` applies to both source and destination
   */
  renderTemplate<const D extends NonNullable<Parameters<MemFsEditor['copyTpl']>[2]>>(
    this: BaseGenerator,
    source?: string | string[],
    destination?: string | string[],
    templateData?: string | D,
    copyOptions?: CopyTplOptions & PathOptions,
  ): void;
  renderTemplate<const D extends NonNullable<Parameters<MemFsEditor['copyTpl']>[2]>>(
    this: BaseGenerator,
    source: string | string[] = '',
    destination: string | string[] = source,
    templateData?: string | D,
    copyOptions?: CopyTplOptions & PathOptions,
    compatOptions?: CopyTplOptions,
  ): void {
    if (compatOptions || 'context' in (copyOptions ?? {})) {
      copyOptions = { ...compatOptions, transformOptions: copyOptions as any };
    }

    if (templateData === undefined || typeof templateData === 'string') {
      templateData = this._templateData(templateData) as D;
    }

    const [pathOptions, copyTplOptions] = splitPathOptions(copyOptions);
    source = Array.isArray(source) ? source : [source];
    const templatePath = this.templatePath(...source, pathOptions);
    destination = Array.isArray(destination) ? destination : [destination];
    const destinationPath = this.destinationPath(...destination, pathOptions);

    this.fs.copyTpl(
      templatePath,
      destinationPath,
      templateData,
      withEditorMetadata(this, {
        fromBasePath: this.templatePath(),
        ...copyTplOptions,
        transformOptions: {
          context: getTemplateContext(this, templatePath),
          ...copyTplOptions?.transformOptions,
        },
      }),
    );
  }

  /**
   * Copy a template from templates folder to the destination.
   *
   * @param source - template file, relative to templatePath(), or absolute inside the source root (outside when the `allowTemplatesOutsideRoot` feature is enabled, inside the generator package when the `allowPackageTemplates` feature is enabled).
   * @param destination - destination, relative to destinationPath(), or absolute inside the destination root (outside when the `allowDestinationOutsideRoot` feature is enabled).
   * @param templateData - ejs data
   * @param templateOptions - ejs options
   * @param copyOptions - mem-fs-editor copy options, `allowOutsideRoot` applies to both source and destination
   */
  async renderTemplateAsync<const D extends NonNullable<Parameters<MemFsEditor['copyTplAsync']>[2]>>(
    this: BaseGenerator,
    source?: string | string[],
    destination?: string | string[],
    templateData?: string | D,
    copyOptions?: CopyTplAsyncOptions & PathOptions,
  ): Promise<void>;
  async renderTemplateAsync<const D extends NonNullable<Parameters<MemFsEditor['copyTplAsync']>[2]>>(
    this: BaseGenerator,
    source: string | string[] = '',
    destination: string | string[] = source,
    templateData?: string | D,
    copyOptions?: CopyTplAsyncOptions & PathOptions,
    compatOptions?: CopyTplAsyncOptions,
  ): Promise<void> {
    if (compatOptions || 'context' in (copyOptions ?? {})) {
      copyOptions = { ...compatOptions, transformOptions: copyOptions as any };
    }

    if (templateData === undefined || typeof templateData === 'string') {
      templateData = this._templateData(templateData) as D;
    }

    const [pathOptions, copyTplOptions] = splitPathOptions(copyOptions);
    source = Array.isArray(source) ? source : [source];
    const templatePath = this.templatePath(...source, pathOptions);
    destination = Array.isArray(destination) ? destination : [destination];
    const destinationPath = this.destinationPath(...destination, pathOptions);

    return this.fs.copyTplAsync(
      templatePath,
      destinationPath,
      templateData,
      withEditorMetadata(this, {
        fromBasePath: this.templatePath(),
        ...copyTplOptions,
        transformOptions: {
          context: getTemplateContext(this, templatePath),
          ...copyTplOptions?.transformOptions,
        },
      }),
    );
  }

  /**
   * Copy templates from templates folder to the destination.
   */
  renderTemplates<const D extends NonNullable<Parameters<MemFsEditor['copyTpl']>[2]>>(
    this: BaseGenerator,
    templates: Templates<typeof this, 'copyTpl', D>,
    templateData?: string | D,
  ) {
    assert.ok(Array.isArray(templates), 'Templates must an array');
    if (templateData === undefined || typeof templateData === 'string') {
      templateData = this._templateData(templateData) as D;
    }

    for (const template of templates) {
      const { templateData: eachData = templateData, source, destination } = template;
      if (!template.when || template.when(eachData as D, this)) {
        this.renderTemplate(source, destination, eachData, {
          fromBasePath: this.templatePath(),
          ...template.copyOptions,
        });
      }
    }
  }

  /**
   * Copy templates from templates folder to the destination.
   *
   * @param templates - template file, relative to templatePath(), or absolute inside the source root (outside when the `allowTemplatesOutsideRoot` feature is enabled, inside the generator package when the `allowPackageTemplates` feature is enabled).
   * @param templateData - ejs data
   */
  async renderTemplatesAsync<const D extends NonNullable<Parameters<MemFsEditor['copyTplAsync']>[2]>>(
    this: BaseGenerator,
    templates: Templates<typeof this, 'copyTplAsync', D>,
    templateData?: string | D,
  ): Promise<void[]> {
    assert.ok(Array.isArray(templates), 'Templates must an array');
    if (templateData === undefined || typeof templateData === 'string') {
      templateData = this._templateData(templateData) as D;
    }

    return Promise.all(
      templates.map(async template => {
        const { templateData: eachData = templateData, source, destination } = template;
        if (!template.when || template.when(eachData as D, this)) {
          return this.renderTemplateAsync(source, destination, eachData, {
            fromBasePath: this.templatePath(),
            ...template.copyOptions,
          });
        }

        return;
      }),
    );
  }

  /**
   * Utility method to get a formatted data for templates.
   *
   * @param path - path to the storage key.
   * @return data to be passed to the templates.
   */
  _templateData(this: BaseGenerator, path?: string) {
    if (path) {
      return this.config.getPath(path);
    }

    const allConfig = this.config.getAll();
    if (this.generatorConfig) {
      Object.assign(allConfig, this.generatorConfig.getAll());
    }

    if (this.instanceConfig) {
      Object.assign(allConfig, this.instanceConfig.getAll());
    }

    return allConfig;
  }
}
