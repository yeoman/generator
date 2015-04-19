# Generator [![npm](https://badge.fury.io/js/yeoman-generator.svg)](http://badge.fury.io/js/yeoman-generator) [![Build Status](https://travis-ci.org/yeoman/generator.svg?branch=master)](https://travis-ci.org/yeoman/generator) [![Coverage Status](https://coveralls.io/repos/yeoman/generator/badge.svg)](https://coveralls.io/r/yeoman/generator)

> Rails-inspired generator system that provides scaffolding for your apps

![](https://raw.githubusercontent.com/yeoman/media/master/optimized/yeoman-masthead.png)

## Getting Started

If you're interested in writing your own Yeoman generator we recommend reading [the official getting started guide](http://yeoman.io/authoring/). The guide covers all the basics you need to get started.

A generator can be as complex as you want it to be. It can simply copy a bunch of boilerplate file, or it can be more advanced asking the user's preferences to scaffold a tailor made project. This decision is up to you.

The fastest way to get started is to use  [generator-generator](https://github.com/yeoman/generator-generator), a Yeoman generator to generate a Yeoman generator.

After reading the getting started guide, you might want to read the code source or visit our [API documentation](http://yeoman.github.io/generator/) for a list of all methods available.


### Debugging

To debug a generator, you can pass Node.js debug's flags by running it like this:

```sh
# OS X / Linux
node --debug `which yo` <generator> [arguments]

# Windows
# Find the path to the yo binary
where yo

# Use this path to run it with the debug flag
node --debug <path to yo binary> <generator> [arguments]
```

Yeoman generators also provide a debug mode to log relevant lifecycle informations. You can activate it by setting the `DEBUG` environment variable to the desired scope (the scope of the generator system is `yeoman:generator`).

```sh
# OS X / Linux
DEBUG=yeoman:generator

# Windows
set DEBUG=yeoman:generator
```

## Contributing

We love contributors! See our [contribution guideline](http://yeoman.io/contributing/) to get started.

## License

[BSD license](http://opensource.org/licenses/bsd-license.php)
Copyright (c) Google
