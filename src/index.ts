import lifecycleMixin from './actions/lifecycle.js';
import fsMixin from './actions/fs.js';
import spawnCommandMixin from './actions/spawn-command.js';
import { BaseGenerator } from './generator.js';
import helpMixin from './actions/help.js';
import userMixin from './actions/user.js';
import packageJsonMixin from './actions/package-json.js';
import { type GeneratorDefinition } from './types.js';

const mixedGenerator = spawnCommandMixin(
  fsMixin(userMixin(packageJsonMixin(helpMixin(lifecycleMixin(BaseGenerator))))),
);

export default class Generator<
  GeneratorTypes extends GeneratorDefinition = GeneratorDefinition,
> extends mixedGenerator<GeneratorTypes> {}
