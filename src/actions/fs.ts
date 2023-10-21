/* eslint max-params: [1, 5] */
import assert from 'node:assert';
import { type CopyOptions, type MemFsEditor } from 'mem-fs-editor';
import type { Data as TemplateData, Options as TemplateOptions } from 'ejs';
import type { OverloadParameters, OverloadReturnType } from '../types-utils.js';
import type BaseGenerator from '../generator.js';

export type Template<D extends TemplateData, G> = {
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
  copyOptions?: CopyOptions;
  /**
   * Ejs data
   */
  templateData?: TemplateData;
  /**
   * Ejs options
   */
  templateOptions?: TemplateOptions;
};

export type Templates<D extends TemplateData, G> = Array<Template<D, G>>;

function applyToFirstStringArg<Type extends [string | string[], ...any]>(
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
  readTemplate(
    this: BaseGenerator,
    ...args: OverloadParameters<MemFsEditor['read']>
  ): OverloadReturnType<MemFsEditor['read']> {
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
    // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
    return this.fs.copy(
      ...applyToFirstAndSecondStringArg(this.templatePath.bind(this), this.destinationPath.bind(this), args),
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
  readDestination(
    this: BaseGenerator,
    ...args: OverloadParameters<MemFsEditor['read']>
  ): OverloadReturnType<MemFsEditor['read']> {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    return this.fs.read(...applyToFirstStringArg(this.destinationPath.bind(this), args));
  }

  /**
   * Read JSON file from destination folder
   * mem-fs-editor method's shortcut, for more information see [mem-fs-editor]{@link https://github.com/SBoudrias/mem-fs-editor}.
   * Shortcut for this.fs!.readJSON(this.destinationPath(filepath)).
   */
  // eslint-disable-next-line @typescript-eslint/naming-convention
  readDestinationJSON(
    this: BaseGenerator,
    ...args: OverloadParameters<MemFsEditor['readJSON']>
  ): OverloadReturnType<MemFsEditor['readJSON']> {
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
  // eslint-disable-next-line @typescript-eslint/naming-convention
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
    // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
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
    // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
    return this.fs.copy(
      ...applyToFirstAndSecondStringArg(this.destinationPath.bind(this), this.destinationPath.bind(this), args),
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
    // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
    return this.fs.move(
      ...applyToFirstAndSecondStringArg(this.destinationPath.bind(this), this.destinationPath.bind(this), args),
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

  renderTemplate<D extends TemplateData = TemplateData>(
    this: BaseGenerator,
    source: string | string[] = '',
    destination: string | string[] = source,
    templateData?: string | D,
    templateOptions?: TemplateOptions,
    copyOptions?: CopyOptions,
  ) {
    if (templateData === undefined || typeof templateData === 'string') {
      templateData = this._templateData<D>(templateData);
    }

    templateOptions = { context: this, ...templateOptions };

    source = Array.isArray(source) ? source : [source];
    const templatePath = this.templatePath(...source);
    destination = Array.isArray(destination) ? destination : [destination];
    const destinationPath = this.destinationPath(...destination);

    this.fs.copyTpl(templatePath, destinationPath, templateData as TemplateData, templateOptions, copyOptions);
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

  async renderTemplateAsync<D extends TemplateData = TemplateData>(
    this: BaseGenerator,
    source: string | string[] = '',
    destination: string | string[] = source,
    templateData?: string | D,
    templateOptions?: TemplateOptions,
    copyOptions?: CopyOptions,
  ) {
    if (templateData === undefined || typeof templateData === 'string') {
      templateData = this._templateData<D>(templateData);
    }

    templateOptions = { context: this, ...templateOptions };

    source = Array.isArray(source) ? source : [source];
    const templatePath = this.templatePath(...source);
    destination = Array.isArray(destination) ? destination : [destination];
    const destinationPath = this.destinationPath(...destination);

    return this.fs.copyTplAsync(
      templatePath,
      destinationPath,
      templateData as TemplateData,
      templateOptions,
      copyOptions,
    );
  }

  /**
   * Copy templates from templates folder to the destination.
   */
  renderTemplates<D extends TemplateData = TemplateData>(
    this: BaseGenerator,
    templates: Templates<D, typeof this>,
    templateData?: string | D,
  ) {
    assert(Array.isArray(templates), 'Templates must an array');
    if (templateData === undefined || typeof templateData === 'string') {
      templateData = this._templateData<D>(templateData);
    }

    for (const template of templates) {
      const { templateData: eachData = templateData, source, destination } = template;
      if (!template.when || template.when(eachData as D, this)) {
        this.renderTemplate(source, destination, eachData, template.templateOptions, template.copyOptions);
      }
    }
  }

  /**
   * Copy templates from templates folder to the destination.
   *
   * @param templates - template file, absolute or relative to templatePath().
   * @param templateData - ejs data
   */
  async renderTemplatesAsync<D extends TemplateData = TemplateData>(
    this: BaseGenerator,
    templates: Templates<D, typeof this>,
    templateData?: string | D,
  ) {
    assert(Array.isArray(templates), 'Templates must an array');
    if (templateData === undefined || typeof templateData === 'string') {
      templateData = this._templateData<D>(templateData);
    }

    return Promise.all(
      templates.map(async template => {
        const { templateData: eachData = templateData, source, destination } = template;
        if (!template.when || template.when(eachData as D, this)) {
          return this.renderTemplateAsync(
            source,
            destination,
            eachData,
            template.templateOptions,
            template.copyOptions,
          );
        }

        return undefined;
      }),
    );
  }

  /**
   * Utility method to get a formatted data for templates.
   *
   * @param path - path to the storage key.
   * @return data to be passed to the templates.
   */
  _templateData<D extends TemplateData = TemplateData>(this: BaseGenerator, path?: string): D {
    if (path) {
      return this.config.getPath(path);
    }

    const allConfig: D = this.config.getAll() as D;
    if (this.generatorConfig) {
      Object.assign(allConfig as any, this.generatorConfig.getAll());
    }

    if (this.instanceConfig) {
      Object.assign(allConfig as any, this.instanceConfig.getAll());
    }

    return allConfig;
  }
}
