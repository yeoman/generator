import { type BaseGenerator } from '../generator.js';

type Constructor<T extends BaseGenerator> = new (...args: any[]) => T;

export default function packageJsonMixin<Parent extends Constructor<BaseGenerator>>(parent: Parent) {
  return class PackageJsonMixin extends parent {
    /**
     * Resolve the dependencies to be added to the package.json.
     */
    async _resolvePackageJsonDependencies(
      dependencies: string | string[] | Record<string, string>,
    ): Promise<Record<string, string>> {
      if (typeof dependencies === 'string') {
        dependencies = [dependencies];
      } else if (typeof dependencies !== 'object') {
        throw new TypeError('resolvePackageJsonDependencies requires an object');
      } else if (!Array.isArray(dependencies)) {
        const deps = await Promise.all(
          Object.entries(dependencies).map(async ([pkg, version]) =>
            version ? Promise.resolve([pkg, version]) : this.env.resolvePackage(pkg, version),
          ),
        );
        return Object.fromEntries(deps.filter(args => args.length > 0 && args[0]));
      }

      const entries = await Promise.all(dependencies.map(async dependency => this.env.resolvePackage(dependency)));
      return Object.fromEntries(entries);
    }

    /**
     * Add dependencies to the destination the package.json.
     *
     * Environment watches for package.json changes at `this.env.cwd`, and triggers an package manager install if it has been committed to disk.
     * If package.json is at a different folder, like a changed generator root, propagate it to the Environment like `this.env.cwd = this.destinationPath()`.
     *
     * @param dependencies
     */
    async addDependencies(dependencies: string | string[] | Record<string, string>): Promise<Record<string, string>> {
      dependencies = await this._resolvePackageJsonDependencies(dependencies);
      this.packageJson.merge({ dependencies });
      return dependencies;
    }

    /**
     * Add dependencies to the destination the package.json.
     *
     * Environment watches for package.json changes at `this.env.cwd`, and triggers an package manager install if it has been committed to disk.
     * If package.json is at a different folder, like a changed generator root, propagate it to the Environment like `this.env.cwd = this.destinationPath()`.
     *
     * @param dependencies
     */
    async addDevDependencies(
      devDependencies: string | string[] | Record<string, string>,
    ): Promise<Record<string, string>> {
      devDependencies = await this._resolvePackageJsonDependencies(devDependencies);
      this.packageJson.merge({ devDependencies });
      return devDependencies;
    }
  };
}
