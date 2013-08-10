

<!-- Start lib/actions/install.js -->

## runInstall(installer, paths, options, cb)

Combine package manager cmd line arguments and run the `install` command.

### Params: 

* **String** *installer* Which package manager to use

* **String|Array** *paths* Packages to install, empty string for `npm install`

* **Object** *options* Options to invoke `install` with

* **Function** *cb* 

## installDependencies(options)

Runs `npm` and `bower` in the generated directory concurrently and prints a
message to let the user know.

### Options:

  - `npm` Boolean whether to run `npm install` (`true`)
  - `bower` Boolean whether to run `bower install` (`true`)
  - `skipInstall` Boolean whether to skip automatic installation (`false`)
  - `skipMessage` Boolean whether to show the used bower/npm commands (`false`)

### Examples:

    this.installDependencies({
      bower: true,
      npm: true,
      skipInstall: false,
      callback: function () {
        console.log('Everything is ready!');
      }
    });

### Params: 

* **Object** *options* 

## bowerInstall(paths, options, cb)

Receives a list of `paths`, and an Hash of `options` to install through bower.

### Params: 

* **String|Array** *paths* Packages to install

* **Object** *options* Options to invoke `bower install` with, see `bower help install`

* **Function** *cb* 

## npmInstall(paths, options, cb)

Receives a list of `paths`, and an Hash of `options` to install through npm.

### Params: 

* **String|Array** *paths* Packages to install

* **Object** *options* Options to invoke `npm install` with, see `npm help install`

* **Function** *cb* 

<!-- End lib/actions/install.js -->

