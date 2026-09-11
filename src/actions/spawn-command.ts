import {
  type Options as ExecaOptions,
  type ResultPromise,
  type SyncOptions,
  type SyncResult,
  execa,
  execaSync,
  parseCommandString,
} from 'execa';
import type { BaseGenerator } from '../generator.js';

export class SpawnCommandMixin {
  /**
   * Normalize a command across OS and spawn it (asynchronously).
   *
   * @param command program to execute
   * @param opt execa options options
   * @see https://github.com/sindresorhus/execa/blob/main/docs/execution.md#command-string
   */
  spawnCommand<const OptionsType extends ExecaOptions>(
    this: BaseGenerator,
    command: string,
    opt?: OptionsType,
  ): ResultPromise<OptionsType> {
    const [file, ...args] = parseCommandString(command);
    return this.spawn(file, args, opt);
  }

  /**
   * Normalize a command across OS and spawn it (asynchronously).
   *
   * @param command program to execute
   * @param args list of arguments to pass to the program
   * @param opt execa options options
   * @see https://github.com/sindresorhus/execa#execafile-arguments-options
   */
  spawn<const OptionsType extends ExecaOptions>(
    this: BaseGenerator,
    command: string,
    args?: readonly string[],
    opt?: OptionsType,
  ): ResultPromise<OptionsType> {
    opt = { cwd: this.destinationRoot(), ...opt } as OptionsType;
    return execa(command, args, opt) as any;
  }

  /**
   * Normalize a command across OS and spawn it (synchronously).
   *
   * @param command program to execute
   * @param opt execa options options
   * @see https://github.com/sindresorhus/execa/blob/main/docs/execution.md#command-string
   */
  spawnCommandSync<const OptionsType extends SyncOptions>(
    this: BaseGenerator,
    command: string,
    opt?: OptionsType,
  ): SyncResult<OptionsType> {
    const [file, ...args] = parseCommandString(command);
    return this.spawnSync(file, args, opt);
  }

  /**
   * Normalize a command across OS and spawn it (synchronously).
   *
   * @param command program to execute
   * @param args list of arguments to pass to the program
   * @param opt execa options options
   * @see https://github.com/sindresorhus/execa#execafile-arguments-options
   */
  spawnSync<const OptionsType extends SyncOptions>(
    this: BaseGenerator,
    command: string,
    args?: readonly string[],
    opt?: OptionsType,
  ): SyncResult<OptionsType> {
    opt = { cwd: this.destinationRoot(), ...opt } as OptionsType;
    return execaSync(command, args, opt);
  }
}
