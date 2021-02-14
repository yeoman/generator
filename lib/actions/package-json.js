'use strict';

/**
 * @mixin
 * @alias actions/packege-json
 */
module.exports = (cls) =>
  class extends cls {
    /**
     * @private
     * Resolve the dependencies to be added to the package.json.
     *
     * @param {Object|string|string[]} dependencies
     * @return {Promise} a 'packageName: packageVersion' object
     */
    async _resolvePackageJsonDependencies(dependencies) {
      if (typeof dependencies === 'string') {
        dependencies = [dependencies];
      } else if (typeof dependencies !== 'object') {
        throw new TypeError(
          'resolvePackageJsonDependencies requires an object'
        );
      } else if (!Array.isArray(dependencies)) {
        return dependencies;
      }

      const entries = await Promise.all(
        dependencies.map((dependency) => this.env.resolvePackage(dependency))
      );
      return Object.fromEntries(entries);
    }

    /**
     * @private
     * Add dependencies to be added to the package.json.
     *
     * @param {Object|string|string[]} dependencies
     * @return {Promise} a 'packageName: packageVersion' object
     */
    async addDependencies(dependencies) {
      dependencies = await this._resolvePackageJsonDependencies(dependencies);
      this.packageJson.merge({dependencies});
      return dependencies;
    }

    async addDevDependencies(devDependencies) {
      devDependencies = await this._resolvePackageJsonDependencies(
        devDependencies
      );
      this.packageJson.merge({devDependencies});
      return devDependencies;
    }
  };
