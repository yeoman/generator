'use strict';

module.exports = (cls) =>
  /**
   * @mixin
   * @alias actions/package-json
   */
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
        dependencies = await Promise.all(
          Object.entries(dependencies).map(([pkg, version]) =>
            version
              ? Promise.resolve([pkg, version])
              : this.env.resolvePackage(pkg, version)
          )
        );
        return Object.fromEntries(
          dependencies.filter((...args) => args.length > 0 && args[0])
        );
      }

      const entries = await Promise.all(
        dependencies.map((dependency) => this.env.resolvePackage(dependency))
      );
      return Object.fromEntries(entries);
    }

    /**
     * Add dependencies to the destination the package.json.
     *
     * Environment watches for package.json changes at `this.env.cwd`, and triggers an package manager install if it has been committed to disk.
     * If package.json is at a different folder, like a changed generator root, propagate it to the Environment like `this.env.cwd = this.destinationPath()`.
     *
     * @param {Object|string|string[]} dependencies
     * @return {Promise} a 'packageName: packageVersion' object
     */
    async addDependencies(dependencies) {
      dependencies = await this._resolvePackageJsonDependencies(dependencies);
      this.packageJson.merge({dependencies});
      return dependencies;
    }

    /**
     * Add dependencies to the destination the package.json.
     *
     * Environment watches for package.json changes at `this.env.cwd`, and triggers an package manager install if it has been committed to disk.
     * If package.json is at a different folder, like a changed generator root, propagate it to the Environment like `this.env.cwd = this.destinationPath()`.
     *
     * @param {Object|string|string[]} dependencies
     * @return {Promise} a 'packageName: packageVersion' object
     */
    async addDevDependencies(devDependencies) {
      devDependencies = await this._resolvePackageJsonDependencies(
        devDependencies
      );
      this.packageJson.merge({devDependencies});
      return devDependencies;
    }
  };
