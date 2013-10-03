# Generator [![Build Status](https://secure.travis-ci.org/yeoman/generator.png?branch=master)](http://travis-ci.org/yeoman/generator) [![Coverage Status](https://coveralls.io/repos/yeoman/generator/badge.png)](https://coveralls.io/r/yeoman/generator)

A Rails-inspired generator system that provides scaffolding for your apps.

![Generator output](https://img.skitch.com/20120923-jxbn2njgk5dp7ttk94i1tx9ek2.png)

![Generator diff](https://img.skitch.com/20120922-kpjs68bgkshtsru4cwnb64fn82.png)


## Getting Started

If you're interested in writing your own Yeoman generator we recommend reading the official [documentation](http://yeoman.io/generators.html).

There are typically two types of generators - simple boilerplate 'copiers' and more advanced generators which can use custom prompts, remote dependencies, wiring and much more.

The docs cover how to create generators from scratch as well as recommending command-line generators for making other generators.


## Testing generators

There is currently no formal infrastructure for testing generators, however you may find our [mocha generator](https://github.com/yeoman/generator-mocha) for custom generators useful.

### Debugging

To debug a generator, you can pass Node.js debug's flags by running it like this:

```bash
# OS X / Linux
node --debug `which yo` <generator> [arguments]

# Windows
node --debug <path to yo binary> <generator> [arguments]
```

Yeoman generators also use a debug mode to log relevant informations. You can activate it by setting the `DEBUG` environment variable to the desired scope (for the generator system scope is `generators:*`).

```bash
# OS X / Linux
DEBUG=generators/*

# Windows
set DEBUG=generators/*
```

## Officially maintained generators

* [Web App](https://github.com/yeoman/generator-webapp#readme)
* [AngularJS](https://github.com/yeoman/generator-angular#readme)
* [Backbone](https://github.com/yeoman/generator-backbone#readme)
* [Chrome Apps Basic Boilerplate](https://github.com/yeoman/generator-chromeapp#readme)
* [Ember](https://github.com/yeoman/generator-ember#readme)
* [Jasmine](https://github.com/yeoman/generator-jasmine#readme)
* [Mocha](https://github.com/yeoman/generator-mocha#readme)
* [Karma](https://github.com/yeoman/generator-karma#readme)
