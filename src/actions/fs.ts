/* eslint max-params: [1, 6] */
import assert from 'node:assert';
import { type MemFsEditor } from 'mem-fs-editor';
import type { OverloadParameters, OverloadReturnType } from '../types-utils.js';
import type { BaseGenerator } from '../generator.js';

type ExtractOverload1<T> = T extends {
  (...args: infer P): infer R; // Captura a 2ª (P = Parâmetros, R = Retorno)
  (...args: any[]): any; // Ignora a 1ª
  (...args: any[]): any; // Ignora a 1ª
  (...args: any[]): any; // Ignora a 1ª
}
  ? (...args: P) => R
  : never;

type ExtractOverload2<T> = T extends {
  (...args: any[]): any; // Ignora a 1ª
  (...args: infer P): infer R; // Captura a 2ª (P = Parâmetros, R = Retorno)
  (...args: any[]): any; // Ignora a 1ª
  (...args: any[]): any; // Ignora a 1ª
}
  ? (...args: P) => R
  : never;

type ReadOverload1 = ExtractOverload1<MemFsEditor['read']>;
type ReadOverload2 = ExtractOverload2<MemFsEditor['read']>;

type ReadJSONOverload1 = ExtractOverload1<MemFsEditor['readJSON']>;
type ReadJSONOverload2 = ExtractOverload2<MemFsEditor['readJSON']>;

export type Template<G, C extends 'copyTplAsync' | 'copyTpl', D extends NonNullable<Parameters<MemFsEditor[C]>[2]>> = {
  /**
   * Template file, absolute or relative to templatePath().
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
   * Destination, absolute or relative to destinationPath().
   */
  destination?: string;
  /**
   * Mem-fs-editor copy options
   */
  copyOptions?: NonNullable<Parameters<MemFsEditor[C]>[3]>;
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

function applyToFirstStringArg<Type extends [string | string[], ...any] = [string | string[], ...any[]]>(
  customizer: (arg1: string) => string,
  args: Type,
): Type {
  args[0] = Array.isArray(args[0]) ? args[0].map(arg => customizer(arg)) : customizer(args[0]);
  return args;
}

function applyToFirstAndSecondStringArg<Type extends [string | string[], string, ...any]>(
  customizer1: (arg1: string) => string,
  customizer2: (arg1: string) => string,
  args: Type,
): Type {
  args = applyToFirstStringArg(customizer1, args);
  args[1] = customizer2(args[1]);
  return args;
}

export class FsMixin {
  fs!: MemFsEditor;

  /**
   * Read file from templates folder.
   * mem-fs-editor method's shortcut, for more information see [mem-fs-editor]{@link https://github.com/SBoudrias/mem-fs-editor}.
   * Shortcut for this.fs!.read(this.templatePath(filepath))
   */
  readTemplate(this: BaseGenerator, ...args: Parameters<ReadOverload1>): ReturnType<ReadOverload1>;
  readTemplate(this: BaseGenerator, ...args: Parameters<ReadOverload2>): ReturnType<ReadOverload2>;
  readTemplate(
    this: BaseGenerator,
    ...args: Parameters<ReadOverload1> | Parameters<ReadOverload2>
  ): ReturnType<ReadOverload1> | ReturnType<ReadOverload2> {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    return this.fs.read(...applyToFirstStringArg(this.templatePath.bind(this), args));
  }

  /**
   * Copy file from templates folder to destination folder.
   * mem-fs-editor method's shortcut, for more information see [mem-fs-editor]{@link https://github.com/SBoudrias/mem-fs-editor}.
   * Shortcut for this.fs!.copy(this.templatePath(from), this.destinationPath(to))
   */
  copyTemplate(
    this: BaseGenerator,
    ...args: OverloadParameters<MemFsEditor['copy']>
  ): OverloadReturnType<MemFsEditor['copy']> {
    const [from, to, options = {}, ...remaining] = args;

    return this.fs.copy(
      from,
      this.destinationPath(to),
      { fromBasePath: this.templatePath(), ...options },
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
    ...args: OverloadParameters<MemFsEditor['copyAsync']>
  ): OverloadReturnType<MemFsEditor['copyAsync']> {
    return this.fs.copyAsync(
      ...applyToFirstAndSecondStringArg(this.templatePath.bind(this), this.destinationPath.bind(this), args),
    );
  }

  /**
   * Read file from destination folder
   * mem-fs-editor method's shortcut, for more information see [mem-fs-editor]{@link https://github.com/SBoudrias/mem-fs-editor}.
   * Shortcut for this.fs!.read(this.destinationPath(filepath)).
   */
  readDestination(this: BaseGenerator, ...args: Parameters<ReadOverload1>): ReturnType<ReadOverload1>;
  readDestination(this: BaseGenerator, ...args: Parameters<ReadOverload2>): ReturnType<ReadOverload2>;
  readDestination(
    this: BaseGenerator,
    ...args: Parameters<ReadOverload1> | Parameters<ReadOverload2>
  ): ReturnType<ReadOverload1> | ReturnType<ReadOverload2> {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    return this.fs.read(...applyToFirstStringArg(this.destinationPath.bind(this), args));
  }

  /**
   * Read JSON file from destination folder
   * mem-fs-editor method's shortcut, for more information see [mem-fs-editor]{@link https://github.com/SBoudrias/mem-fs-editor}.
   * Shortcut for this.fs!.readJSON(this.destinationPath(filepath)).
   */
  readDestinationJSON(this: BaseGenerator, ...args: Parameters<ReadJSONOverload1>): ReturnType<ReadJSONOverload1>;
  readDestinationJSON(this: BaseGenerator, ...args: Parameters<ReadJSONOverload2>): ReturnType<ReadJSONOverload2>;
  readDestinationJSON(
    this: BaseGenerator,
    ...args: Parameters<ReadJSONOverload1> | Parameters<ReadJSONOverload2>
  ): ReturnType<ReadJSONOverload1> | ReturnType<ReadJSONOverload2> {
    return this.fs.readJSON(...applyToFirstStringArg(this.destinationPath.bind(this), args));
  }

  /**
   * Write file to destination folder
   * mem-fs-editor method's shortcut, for more information see [mem-fs-editor]{@link https://github.com/SBoudrias/mem-fs-editor}.
   * Shortcut for this.fs!.write(this.destinationPath(filepath)).
   */
  writeDestination(
    this: BaseGenerator,
    ...args: OverloadParameters<MemFsEditor['write']>
  ): OverloadReturnType<MemFsEditor['write']> {
    return this.fs.write(...applyToFirstStringArg(this.destinationPath.bind(this), args));
  }

  /**
   * Write json file to destination folder
   * mem-fs-editor method's shortcut, for more information see [mem-fs-editor]{@link https://github.com/SBoudrias/mem-fs-editor}.
   * Shortcut for this.fs!.writeJSON(this.destinationPath(filepath)).
   */
  writeDestinationJSON(
    this: BaseGenerator,
    ...args: OverloadParameters<MemFsEditor['writeJSON']>
  ): OverloadReturnType<MemFsEditor['writeJSON']> {
    return this.fs.writeJSON(...applyToFirstStringArg(this.destinationPath.bind(this), args));
  }

  /**
   * Delete file from destination folder
   * mem-fs-editor method's shortcut, for more information see [mem-fs-editor]{@link https://github.com/SBoudrias/mem-fs-editor}.
   * Shortcut for this.fs!.delete(this.destinationPath(filepath)).
   */
  deleteDestination(
    this: BaseGenerator,
    ...args: OverloadParameters<MemFsEditor['delete']>
  ): OverloadReturnType<MemFsEditor['delete']> {
    return this.fs.delete(...applyToFirstStringArg(this.destinationPath.bind(this), args));
  }

  /**
   * Copy file from destination folder to another destination folder.
   * mem-fs-editor method's shortcut, for more information see [mem-fs-editor]{@link https://github.com/SBoudrias/mem-fs-editor}.
   * Shortcut for this.fs!.copy(this.destinationPath(from), this.destinationPath(to)).
   */
  copyDestination(
    this: BaseGenerator,
    ...args: OverloadParameters<MemFsEditor['copy']>
  ): OverloadReturnType<MemFsEditor['copy']> {
    const [from, to, options = {}, ...remaining] = args;

    return this.fs.copy(
      from,
      this.destinationPath(to),
      { fromBasePath: this.destinationPath(), ...options },
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
    ...args: OverloadParameters<MemFsEditor['move']>
  ): OverloadReturnType<MemFsEditor['move']> {
    const [from, to, options, ...remaining] = args;

    return this.fs.move(
      from,
      this.destinationPath(to),
      { fromBasePath: this.destinationPath(), ...options },
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
    ...args: OverloadParameters<MemFsEditor['exists']>
  ): OverloadReturnType<MemFsEditor['exists']> {
    return this.fs.exists(...applyToFirstStringArg(this.destinationPath.bind(this), args));
  }

  /**
   * Copy a template from templates folder to the destination.
   *
   * @param source - template file, absolute or relative to templatePath().
   * @param destination - destination, absolute or relative to destinationPath().
   * @param templateData - ejs data
   * @param templateOptions - ejs options
   * @param copyOptions - mem-fs-editor copy options
   */
  renderTemplate<const D extends NonNullable<Parameters<MemFsEditor['copyTpl']>[2]>>(
    this: BaseGenerator,
    source: string | string[] = '',
    destination: string | string[] = source,
    templateData?: string | D,
    copyOptions?: NonNullable<Parameters<MemFsEditor['copyTpl']>[3]>,
  ) {
    if (templateData === undefined || typeof templateData === 'string') {
      templateData = this._templateData(templateData) as D;
    }

    source = Array.isArray(source) ? source : [source];
    const templatePath = this.templatePath(...source);
    destination = Array.isArray(destination) ? destination : [destination];
    const destinationPath = this.destinationPath(...destination);

    this.fs.copyTpl(templatePath, destinationPath, templateData, {
      fromBasePath: this.templatePath(),
      ...copyOptions,
      transformOptions: {
        context: this,
        ...copyOptions?.transformOptions,
      },
    });
  }

  /**
   * Copy a template from templates folder to the destination.
   *
   * @param source - template file, absolute or relative to templatePath().
   * @param destination - destination, absolute or relative to destinationPath().
   * @param templateData - ejs data
   * @param templateOptions - ejs options
   * @param copyOptions - mem-fs-editor copy options
   */
  async renderTemplateAsync<const D extends NonNullable<Parameters<MemFsEditor['copyTplAsync']>[2]>>(
    this: BaseGenerator,
    source: string | string[] = '',
    destination: string | string[] = source,
    templateData?: string | D,
    copyOptions?: NonNullable<Parameters<MemFsEditor['copyTplAsync']>[3]>,
  ) {
    if (templateData === undefined || typeof templateData === 'string') {
      templateData = this._templateData(templateData) as D;
    }

    source = Array.isArray(source) ? source : [source];
    const templatePath = this.templatePath(...source);
    destination = Array.isArray(destination) ? destination : [destination];
    const destinationPath = this.destinationPath(...destination);

    return this.fs.copyTplAsync(templatePath, destinationPath, templateData, {
      fromBasePath: this.templatePath(),
      ...copyOptions,
      transformOptions: {
        context: this,
        ...copyOptions?.transformOptions,
      },
    });
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
   * @param templates - template file, absolute or relative to templatePath().
   * @param templateData - ejs data
   */
  async renderTemplatesAsync<const D extends NonNullable<Parameters<MemFsEditor['copyTplAsync']>[2]>>(
    this: BaseGenerator,
    templates: Templates<typeof this, 'copyTplAsync', D>,
    templateData?: string | D,
  ) {
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
