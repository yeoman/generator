import { existsSync, mkdirSync } from 'node:fs';

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
   * Resolve the options to spawn a command with, defaulting `cwd` to the destination root.
   * A command cannot be spawned in a directory that does not exist, so create it on demand.
   *
   * @param opt execa options
   * @returns the options with `cwd` set
   */
  private resolveSpawnOptions<const OptionsType extends ExecaOptions | SyncOptions>(
    this: BaseGenerator,
    opt?: OptionsType,
  ): OptionsType {
    const cwd = opt?.cwd ?? this.destinationRoot();
    if (!existsSync(cwd)) {
      mkdirSync(cwd, { recursive: true });
    }

    return { ...opt, cwd } as OptionsType;
  }

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
    return execa(command, args, this.resolveSpawnOptions(opt)) as any;
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
    return execaSync(command, args, this.resolveSpawnOptions(opt));
  }
}
