import type { BaseEnvironment, BaseGenerator, PromptAnswers, PromptQuestions } from '@yeoman/types';
import type Storage from './util/storage.js';
import type { BaseFeatures, BaseOptions } from './index.js';

export class GeneratorOrigin implements BaseGenerator {
  declare env: BaseEnvironment;
  declare _destinationRoot: string | undefined;
  declare _namespace: string;
  declare features: BaseFeatures;
  declare _running: boolean;
  declare _prompts: any;
  declare args: string[];
  declare log: any;
  declare yoGeneratorVersion: string;
  declare options: BaseOptions;
  declare resolved: string;
  declare description: string;

  declare readonly config: Storage;
  declare readonly packageJson: Storage;
  declare readonly generatorConfig?: Storage;
  declare readonly instanceConfig?: Storage;

  declare destinationRoot: () => string;
  declare destinationPath: (...args: string[]) => string;
  declare templatePath: (...args: string[]) => string;
  declare sourceRoot: (root?: string) => string;
  declare emit: (eventName: string | symbol, ...args: any[]) => boolean;
  declare on: (eventName: string | symbol, listener: (...args: any[]) => void) => this;
}
