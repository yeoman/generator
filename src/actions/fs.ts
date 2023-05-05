/* eslint max-params: [1, 5] */
import assert from 'node:assert';
import { type CopyOptions, type MemFsEditor } from 'mem-fs-editor';
// eslint-disable-next-line import/no-extraneous-dependencies
import { type Data as TemplateData, type Options as TemplateOptions } from 'ejs';
import { type BaseGenerator } from '../generator.js';

export type Template<Generator> = {
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
  when?: (TemplateData, Generator) => boolean;
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

export type Templates<Generator> = Array<Template<Generator>>;

function applyToFirstStringArg<Type extends [string | string[], ...any]>(
  customizer: (string) => string,
  args: Type,
): Type {
  args[0] = Array.isArray(args[0]) ? args[0].map(arg => customizer(arg)) : customizer(args[0]);
  return args;
}

function applyToFirstAndSecondStringArg<Type extends [string | string[], string, ...any]>(
  customizer1: (string) => string,
  customizer2: (string) => string,
  args: Type,
): Type {
  args = applyToFirstStringArg(customizer1, args);
  args[1] = customizer2(args[1]);
  return args;
}

type Constructor<T extends BaseGenerator> = new (...args: any[]) => T;

export default function fsMixin<Parent extends Constructor<BaseGenerator>>(parent: Parent) {
  return class FsMixin extends parent {
    /**
     * Read file from templates folder.
     * mem-fs-editor method's shortcut, for more information see [mem-fs-editor]{@link https://github.com/SBoudrias/mem-fs-editor}.
     * Shortcut for this.fs!.read(this.templatePath(filepath))
     */
    readTemplate(...args: Parameters<MemFsEditor['read']>): ReturnType<MemFsEditor['read']> {
      return this.fs.read(...applyToFirstStringArg(this.templatePath.bind(this), args));
    }

    /**
     * Copy file from templates folder to destination folder.
     * mem-fs-editor method's shortcut, for more information see [mem-fs-editor]{@link https://github.com/SBoudrias/mem-fs-editor}.
     * Shortcut for this.fs!.copy(this.templatePath(from), this.destinationPath(to))
     */
    copyTemplate(...args: Parameters<MemFsEditor['copy']>): ReturnType<MemFsEditor['copy']> {
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
    async copyTemplateAsync(...args: Parameters<MemFsEditor['copyAsync']>): ReturnType<MemFsEditor['copyAsync']> {
      return this.fs.copyAsync(
        ...applyToFirstAndSecondStringArg(this.templatePath.bind(this), this.destinationPath.bind(this), args),
      );
    }

    /**
     * Read file from destination folder
     * mem-fs-editor method's shortcut, for more information see [mem-fs-editor]{@link https://github.com/SBoudrias/mem-fs-editor}.
     * Shortcut for this.fs!.read(this.destinationPath(filepath)).
     */
    readDestination(...args: Parameters<MemFsEditor['read']>): ReturnType<MemFsEditor['read']> {
      return this.fs.read(...applyToFirstStringArg(this.destinationPath.bind(this), args));
    }

    /**
     * Read JSON file from destination folder
     * mem-fs-editor method's shortcut, for more information see [mem-fs-editor]{@link https://github.com/SBoudrias/mem-fs-editor}.
     * Shortcut for this.fs!.readJSON(this.destinationPath(filepath)).
     */
    // eslint-disable-next-line @typescript-eslint/naming-convention
    readDestinationJSON(...args: Parameters<MemFsEditor['readJSON']>): ReturnType<MemFsEditor['readJSON']> {
      return this.fs.readJSON(...applyToFirstStringArg(this.destinationPath.bind(this), args));
    }

    /**
     * Write file to destination folder
     * mem-fs-editor method's shortcut, for more information see [mem-fs-editor]{@link https://github.com/SBoudrias/mem-fs-editor}.
     * Shortcut for this.fs!.write(this.destinationPath(filepath)).
     */
    writeDestination(...args: Parameters<MemFsEditor['write']>): ReturnType<MemFsEditor['write']> {
      return this.fs.write(...applyToFirstStringArg(this.destinationPath.bind(this), args));
    }

    /**
     * Write json file to destination folder
     * mem-fs-editor method's shortcut, for more information see [mem-fs-editor]{@link https://github.com/SBoudrias/mem-fs-editor}.
     * Shortcut for this.fs!.writeJSON(this.destinationPath(filepath)).
     */
    // eslint-disable-next-line @typescript-eslint/naming-convention
    writeDestinationJSON(...args: Parameters<MemFsEditor['writeJSON']>): ReturnType<MemFsEditor['writeJSON']> {
      return this.fs.writeJSON(...applyToFirstStringArg(this.destinationPath.bind(this), args));
    }

    /**
     * Delete file from destination folder
     * mem-fs-editor method's shortcut, for more information see [mem-fs-editor]{@link https://github.com/SBoudrias/mem-fs-editor}.
     * Shortcut for this.fs!.delete(this.destinationPath(filepath)).
     */
    deleteDestination(...args: Parameters<MemFsEditor['delete']>): ReturnType<MemFsEditor['delete']> {
      // eslint-disable-next-line @typescript-eslint/no-confusing-void-expression
      return this.fs.delete(...applyToFirstStringArg(this.destinationPath.bind(this), args));
    }

    /**
     * Copy file from destination folder to another destination folder.
     * mem-fs-editor method's shortcut, for more information see [mem-fs-editor]{@link https://github.com/SBoudrias/mem-fs-editor}.
     * Shortcut for this.fs!.copy(this.destinationPath(from), this.destinationPath(to)).
     */
    copyDestination(...args: Parameters<MemFsEditor['copy']>): ReturnType<MemFsEditor['copy']> {
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
    moveDestination(...args: Parameters<MemFsEditor['move']>): ReturnType<MemFsEditor['move']> {
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
    existsDestination(...args: Parameters<MemFsEditor['exists']>): ReturnType<MemFsEditor['exists']> {
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
    renderTemplate(
      source: string | string[] = '',
      destination: string | string[] = source,
      templateData: string | TemplateData = this._templateData(),
      templateOptions?: TemplateOptions,
      copyOptions?: CopyOptions,
    ) {
      if (typeof templateData === 'string') {
        templateData = this._templateData(templateData);
      }

      templateOptions = { context: this, ...templateOptions };

      source = Array.isArray(source) ? source : [source];
      const templatePath = this.templatePath(...source);
      destination = Array.isArray(destination) ? destination : [destination];
      const destinationPath = this.destinationPath(...destination);

      this.fs.copyTpl(templatePath, destinationPath, templateData, templateOptions, copyOptions);
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
    async renderTemplateAsync(
      source: string | string[] = '',
      destination: string | string[] = source,
      templateData: string | TemplateData = this._templateData(),
      templateOptions?: TemplateOptions,
      copyOptions?: CopyOptions,
    ) {
      if (typeof templateData === 'string') {
        templateData = this._templateData(templateData);
      }

      templateOptions = { context: this, ...templateOptions };

      source = Array.isArray(source) ? source : [source];
      const templatePath = this.templatePath(...source);
      destination = Array.isArray(destination) ? destination : [destination];
      const destinationPath = this.destinationPath(...destination);

      return this.fs.copyTplAsync(templatePath, destinationPath, templateData, templateOptions, copyOptions);
    }

    /**
     * Copy templates from templates folder to the destination.
     */
    renderTemplates(templates: Templates<FsMixin>, templateData: string | TemplateData = this._templateData()) {
      assert(Array.isArray(templates), 'Templates must an array');
      if (typeof templateData === 'string') {
        templateData = this._templateData(templateData);
      }

      for (const template of templates) {
        const { templateData: eachData = templateData, source, destination } = template;
        if (!template.when || template.when(eachData, this)) {
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
    async renderTemplatesAsync(
      templates: Templates<FsMixin>,
      templateData: string | TemplateData = this._templateData(),
    ) {
      assert(Array.isArray(templates), 'Templates must an array');
      if (typeof templateData === 'string') {
        templateData = this._templateData(templateData);
      }

      return Promise.all(
        templates.map(async template => {
          const { templateData: eachData = templateData, source, destination } = template;
          if (!template.when || template.when(eachData, this)) {
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
    _templateData(path?: string): TemplateData {
      if (path) {
        return this.config.getPath(path) as TemplateData;
      }

      const allConfig: TemplateData = this.config.getAll() as TemplateData;
      if (this.generatorConfig) {
        Object.assign(allConfig, this.generatorConfig.getAll());
      }

      if (this.instanceConfig) {
        Object.assign(allConfig, this.instanceConfig.getAll());
      }

      return allConfig;
    }
  };
}
