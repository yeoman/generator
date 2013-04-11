### master

- `generator.install` was renamed to `generator.bowerInstall`, also
  `generator.installDependencies` and `generator.npmInstall` were added (Pull [#205](https://github.com/yeoman/generator/pull/205)).

### 0.10.4 - 2013-04-08

- Generators can now be installed globally

- Improved startup time

- Improved error message when a generator is not found


### 0.10.0 - 2013-02-14

- Rewritten, but API compatible

- All generators extracted out into it's own repos

- Renamed from `generators` to `generator`

- Some new API method. See the docs.


### 0.9.2 - 2012-09-25

- index.html conflict solved (Pull [#66](https://github.com/yeoman/generators/pull/66)).

- Update for grunt-coffee task (Pull [#62](https://github.com/yeoman/generators/pull/62)).

- Generators now use app/components for bower installs (Issue [#65](https://github.com/yeoman/generators/issues/65)).

- Updated lodash to 0.7.0 and backbone.layoutmanager to 0.6.6 (Pull [#60](https://github.com/yeoman/generators/pull/60)).

- File collision menu, tests for individual generators, mocha:generator and better looking output (Pull [#63](https://github.com/yeoman/generators/pull/63)).

- Ensure server is launched before tests (Pull [#56](https://github.com/yeoman/generators/pull/56)).

- angularjs: gets es5 shim and json3 conditionally for oldIE (Pull [#61](https://github.com/yeoman/generators/pull/61)).

- Chrome Apps Generator gets a few many fixes (Pull [#59](https://github.com/yeoman/generators/pull/59)).

- Fix for issues to do with library clobbering due to re-use of the scripts/vendor directory (Pull [#57](https://github.com/yeoman/generators/pull/57)).

- Fix for grunt-contrib-coffee breaking yeoman server (Pull [#57](https://github.com/yeoman/generators/pull/57)).
