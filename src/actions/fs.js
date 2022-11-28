/* eslint max-params: [1, 5] */
import assert from 'node:assert';

const renderEachTemplate = (template, templateData, context, callback) => {
  if (template.when && !template.when(templateData, context)) {
    return;
  }

  const {source, destination, templateOptions, copyOptions} = template;
  return callback(
    source,
    destination,
    templateData,
    templateOptions,
    copyOptions,
  );
};

const fsMixin = (Parent) =>
  class FsMixin extends Parent {
    /**
     * Read file from templates folder.
     * mem-fs-editor method's shortcut, for more information see [mem-fs-editor]{@link https://github.com/SBoudrias/mem-fs-editor}.
     * Shortcut for this.fs.read(this.templatePath(filepath))
     *
     * @param {String} filepath - absolute file path or relative to templates folder.
     * @param {...*} args - for more information see [mem-fs-editor]{@link https://github.com/SBoudrias/mem-fs-editor}
     * @returns {*} for more information see [mem-fs-editor]{@link https://github.com/SBoudrias/mem-fs-editor}
     */
    readTemplate(filepath, ...args) {
      return this.fs.read(this.templatePath(filepath), ...args);
    }

    /**
     * Copy file from templates folder to destination folder.
     * mem-fs-editor method's shortcut, for more information see [mem-fs-editor]{@link https://github.com/SBoudrias/mem-fs-editor}.
     * Shortcut for this.fs.copy(this.templatePath(from), this.destinationPath(to))
     *
     * @param {String} from - absolute file path or relative to templates folder.
     * @param {String} to - absolute file path or relative to destination folder.
     * @param {...*} args - for more information see [mem-fs-editor]{@link https://github.com/SBoudrias/mem-fs-editor}
     * @returns {*} for more information see [mem-fs-editor]{@link https://github.com/SBoudrias/mem-fs-editor}
     */
    copyTemplate(from, to, ...args) {
      return this.fs.copy(
        this.templatePath(from),
        this.destinationPath(to),
        ...args,
      );
    }

    /**
     * Copy file from templates folder to destination folder.
     * mem-fs-editor method's shortcut, for more information see [mem-fs-editor]{@link https://github.com/SBoudrias/mem-fs-editor}.
     * Shortcut for this.fs.copy(this.templatePath(from), this.destinationPath(to))
     *
     * @param {String} from - absolute file path or relative to templates folder.
     * @param {String} to - absolute file path or relative to destination folder.
     * @param {...*} args - for more information see [mem-fs-editor]{@link https://github.com/SBoudrias/mem-fs-editor}
     * @returns {*} for more information see [mem-fs-editor]{@link https://github.com/SBoudrias/mem-fs-editor}
     */
    copyTemplateAsync(from, to, ...args) {
      this.checkEnvironmentVersion('mem-fs-editor', '9.0.0');
      return this.fs.copyAsync(
        this.templatePath(from),
        this.destinationPath(to),
        ...args,
      );
    }

    /**
     * Read file from destination folder
     * mem-fs-editor method's shortcut, for more information see [mem-fs-editor]{@link https://github.com/SBoudrias/mem-fs-editor}.
     * Shortcut for this.fs.read(this.destinationPath(filepath)).
     *
     * @param {String} filepath - absolute file path or relative to destination folder.
     * @param {...*} args - for more information see [mem-fs-editor]{@link https://github.com/SBoudrias/mem-fs-editor}
     * @returns {*} for more information see [mem-fs-editor]{@link https://github.com/SBoudrias/mem-fs-editor}
     */
    readDestination(filepath, ...args) {
      return this.fs.read(this.destinationPath(filepath), ...args);
    }

    /**
     * Read JSON file from destination folder
     * mem-fs-editor method's shortcut, for more information see [mem-fs-editor]{@link https://github.com/SBoudrias/mem-fs-editor}.
     * Shortcut for this.fs.readJSON(this.destinationPath(filepath)).
     *
     * @param {String} filepath - absolute file path or relative to destination folder.
     * @param {...*} args - for more information see [mem-fs-editor]{@link https://github.com/SBoudrias/mem-fs-editor}
     * @returns {*} for more information see [mem-fs-editor]{@link https://github.com/SBoudrias/mem-fs-editor}
     */
    readDestinationJSON(filepath, ...args) {
      return this.fs.readJSON(this.destinationPath(filepath), ...args);
    }

    /**
     * Write file to destination folder
     * mem-fs-editor method's shortcut, for more information see [mem-fs-editor]{@link https://github.com/SBoudrias/mem-fs-editor}.
     * Shortcut for this.fs.write(this.destinationPath(filepath)).
     *
     * @param {String} filepath - absolute file path or relative to destination folder.
     * @param {...*} args - for more information see [mem-fs-editor]{@link https://github.com/SBoudrias/mem-fs-editor}
     * @returns {*} for more information see [mem-fs-editor]{@link https://github.com/SBoudrias/mem-fs-editor}
     */
    writeDestination(filepath, ...args) {
      return this.fs.write(this.destinationPath(filepath), ...args);
    }

    /**
     * Write json file to destination folder
     * mem-fs-editor method's shortcut, for more information see [mem-fs-editor]{@link https://github.com/SBoudrias/mem-fs-editor}.
     * Shortcut for this.fs.writeJSON(this.destinationPath(filepath)).
     *
     * @param {String} filepath - absolute file path or relative to destination folder.
     * @param {...*} args - for more information see [mem-fs-editor]{@link https://github.com/SBoudrias/mem-fs-editor}
     * @returns {*} for more information see [mem-fs-editor]{@link https://github.com/SBoudrias/mem-fs-editor}
     */
    writeDestinationJSON(filepath, ...args) {
      return this.fs.writeJSON(this.destinationPath(filepath), ...args);
    }

    /**
     * Delete file from destination folder
     * mem-fs-editor method's shortcut, for more information see [mem-fs-editor]{@link https://github.com/SBoudrias/mem-fs-editor}.
     * Shortcut for this.fs.delete(this.destinationPath(filepath)).
     *
     * @param {String} filepath - absolute file path or relative to destination folder.
     * @param {...*} args - for more information see [mem-fs-editor]{@link https://github.com/SBoudrias/mem-fs-editor}
     * @returns {*} for more information see [mem-fs-editor]{@link https://github.com/SBoudrias/mem-fs-editor}
     */
    deleteDestination(filepath, ...args) {
      return this.fs.delete(this.destinationPath(filepath), ...args);
    }

    /**
     * Copy file from destination folder to another destination folder.
     * mem-fs-editor method's shortcut, for more information see [mem-fs-editor]{@link https://github.com/SBoudrias/mem-fs-editor}.
     * Shortcut for this.fs.copy(this.destinationPath(from), this.destinationPath(to)).
     *
     * @param {String} from - absolute file path or relative to destination folder.
     * @param {String} to - absolute file path or relative to destination folder.
     * @param {...*} args - for more information see [mem-fs-editor]{@link https://github.com/SBoudrias/mem-fs-editor}
     * @returns {*} for more information see [mem-fs-editor]{@link https://github.com/SBoudrias/mem-fs-editor}
     */
    copyDestination(from, to, ...args) {
      return this.fs.copy(
        this.destinationPath(from),
        this.destinationPath(to),
        ...args,
      );
    }

    /**
     * Move file from destination folder to another destination folder.
     * mem-fs-editor method's shortcut, for more information see [mem-fs-editor]{@link https://github.com/SBoudrias/mem-fs-editor}.
     * Shortcut for this.fs.move(this.destinationPath(from), this.destinationPath(to)).
     *
     * @param {String} from - absolute file path or relative to destination folder.
     * @param {String} to - absolute file path or relative to destination folder.
     * @returns {*} for more information see [mem-fs-editor]{@link https://github.com/SBoudrias/mem-fs-editor}
     */
    moveDestination(from, to, ...args) {
      return this.fs.move(
        this.destinationPath(from),
        this.destinationPath(to),
        ...args,
      );
    }

    /**
     * Exists file on destination folder.
     * mem-fs-editor method's shortcut, for more information see [mem-fs-editor]{@link https://github.com/SBoudrias/mem-fs-editor}.
     * Shortcut for this.fs.exists(this.destinationPath(filepath)).
     *
     * @param {String} filepath - absolute file path or relative to destination folder.
     * @param {...*} args - for more information see [mem-fs-editor]{@link https://github.com/SBoudrias/mem-fs-editor}
     * @returns {*} for more information see [mem-fs-editor]{@link https://github.com/SBoudrias/mem-fs-editor}
     */
    existsDestination(filepath, ...args) {
      return this.fs.exists(this.destinationPath(filepath), ...args);
    }

    /**
     * Copy a template from templates folder to the destination.
     *
     * @param  {String|Array} source - template file, absolute or relative to templatePath().
     * @param  {String|Array} [destination] - destination, absolute or relative to destinationPath().
     * @param {Object} [templateData] - ejs data
     * @param {Object} [templateOptions] - ejs options
     * @param {Object} [copyOptions] - mem-fs-editor copy options
     */
    renderTemplate(
      source = '',
      destination = source,
      templateData = this._templateData(),
      templateOptions,
      copyOptions,
    ) {
      if (typeof templateData === 'string') {
        templateData = this._templateData(templateData);
      }

      templateOptions = {context: this, ...templateOptions};

      source = Array.isArray(source) ? source : [source];
      const templatePath = this.templatePath(...source);
      destination = Array.isArray(destination) ? destination : [destination];
      const destinationPath = this.destinationPath(...destination);

      this.fs.copyTpl(
        templatePath,
        destinationPath,
        templateData,
        templateOptions,
        copyOptions,
      );
    }

    /**
     * Copy a template from templates folder to the destination.
     *
     * @param  {String|Array} source - template file, absolute or relative to templatePath().
     * @param  {String|Array} [destination] - destination, absolute or relative to destinationPath().
     * @param {Object} [templateData] - ejs data
     * @param {Object} [templateOptions] - ejs options
     * @param {Object} [copyOptions] - mem-fs-editor copy options
     */
    renderTemplateAsync(
      source = '',
      destination = source,
      templateData = this._templateData(),
      templateOptions,
      copyOptions,
    ) {
      this.checkEnvironmentVersion('mem-fs-editor', '9.0.0');
      if (typeof templateData === 'string') {
        templateData = this._templateData(templateData);
      }

      templateOptions = {context: this, ...templateOptions};

      source = Array.isArray(source) ? source : [source];
      const templatePath = this.templatePath(...source);
      destination = Array.isArray(destination) ? destination : [destination];
      const destinationPath = this.destinationPath(...destination);

      return this.fs.copyTplAsync(
        templatePath,
        destinationPath,
        templateData,
        templateOptions,
        copyOptions,
      );
    }

    /**
     * Copy templates from templates folder to the destination.
     *
     * @param  {Array} templates - template file, absolute or relative to templatePath().
     * @param  {function} [templates.when] - conditional if the template should be written.
     *                                       First argument is the templateData, second is the generator.
     * @param  {String|Array} templates.source - template file, absolute or relative to templatePath().
     * @param  {String|Array} [templates.destination] - destination, absolute or relative to destinationPath().
     * @param {Object} [templates.templateOptions] - ejs options
     * @param {Object} [templates.copyOptions] - mem-fs-editor copy options
     * @param {Object} [templateData] - ejs data
     */
    renderTemplates(templates, templateData = this._templateData()) {
      assert(Array.isArray(templates), 'Templates must an array');
      if (typeof templateData === 'string') {
        templateData = this._templateData(templateData);
      }

      for (const template of templates)
        renderEachTemplate(template, templateData, this, (...args) =>
          this.renderTemplate(...args),
        );
    }

    /**
     * Copy templates from templates folder to the destination.
     *
     * @param  {Array} templates - template file, absolute or relative to templatePath().
     * @param  {function} [templates.when] - conditional if the template should be written.
     *                                       First argument is the templateData, second is the generator.
     * @param  {String|Array} templates.source - template file, absolute or relative to templatePath().
     * @param  {String|Array} [templates.destination] - destination, absolute or relative to destinationPath().
     * @param {Object} [templates.templateOptions] - ejs options
     * @param {Object} [templates.copyOptions] - mem-fs-editor copy options
     * @param {Object} [templateData] - ejs data
     */
    renderTemplatesAsync(templates, templateData = this._templateData()) {
      assert(Array.isArray(templates), 'Templates must an array');
      this.checkEnvironmentVersion('mem-fs-editor', '9.0.0');
      if (typeof templateData === 'string') {
        templateData = this._templateData(templateData);
      }

      return Promise.all(
        templates.map((template) =>
          renderEachTemplate(template, templateData, this, (...args) =>
            this.renderTemplateAsync(...args),
          ),
        ),
      );
    }

    /**
     * Utility method to get a formatted data for templates.
     *
     * @param {String} path - path to the storage key.
     * @return {Object} data to be passed to the templates.
     */
    _templateData(path) {
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
  };

export default fsMixin;
