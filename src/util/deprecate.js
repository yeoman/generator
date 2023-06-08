import { template } from 'lodash-es';
import chalk from 'chalk';

const deprecate = (message, fn) => {
  return function (...args) {
    deprecate.log(message);
    return Reflect.apply(fn, this, args);
  };
};

deprecate.log = message => {
  console.log(chalk.yellow('(!) ') + message);
};

deprecate.object = (message, object) => {
  const messageTpl = template(message);
  const mirror = [];

  for (const name of Object.keys(object)) {
    const func = object[name];

    if (typeof func !== 'function') {
      mirror[name] = func;
      continue;
    }

    mirror[name] = deprecate(messageTpl({ name }), func);
  }

  return mirror;
};

deprecate.property = (message, object, property) => {
  const original = object[property];
  Object.defineProperty(object, property, {
    get() {
      deprecate.log(message);
      return original;
    },
  });
};

export default deprecate;
