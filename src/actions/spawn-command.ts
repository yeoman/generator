import type Buffer from 'node:buffer';
import {
  execa,
  execaSync,
  execaCommand,
  execaCommandSync,
  type Options as ExecaOptions,
  type ExecaChildProcess,
  type SyncOptions,
  type ExecaSyncReturnValue,
} from 'execa';
import type BaseGenerator from '../generator.js';

export class SpawnCommandMixin {
  /**
   * Normalize a command across OS and spawn it (asynchronously).
   *
   * @param command program to execute
   * @param opt execa options options
   * @see https://github.com/sindresorhus/execa#execacommandcommand-options
   */
  spawnCommand(command: string, opt?: ExecaOptions): ExecaChildProcess;
  spawnCommand(command: string, opt?: ExecaOptions<undefined>): ExecaChildProcess<Buffer>;
  /**
   * @deprecated use `spawn` for file with args execution
   * Normalize a command across OS and spawn it (asynchronously).
   *
   * @param command program to execute
   * @param args list of arguments to pass to the program
   * @param opt execa options options
   */
  spawnCommand(command: string, args?: readonly string[], opt?: ExecaOptions): ExecaChildProcess;
  /**
   * @deprecated use `spawn` for file with args execution
   * Normalize a command across OS and spawn it (asynchronously).
   *
   * @param command program to execute
   * @param args list of arguments to pass to the program
   * @param opt execa options options
   */
  spawnCommand(command: string, args?: readonly string[], opt?: ExecaOptions<undefined>): ExecaChildProcess<Buffer>;
  spawnCommand(
    this: BaseGenerator,
    command: string,
    args?: readonly string[] | ExecaOptions<any>,
    opt?: ExecaOptions<any>,
  ): ExecaChildProcess<any> {
    if (Array.isArray(args) || (opt && args === undefined)) {
      return this.spawn(command, args, opt);
    }

    return execaCommand(command, {
      stdio: 'inherit',
      cwd: this.destinationRoot(),
      ...args,
    });
  }

  /**
   * Normalize a command across OS and spawn it (asynchronously).
   *
   * @param command program to execute
   * @param args list of arguments to pass to the program
   * @param opt execa options options
   * @see https://github.com/sindresorhus/execa#execafile-arguments-options
   */
  spawn(command: string, args?: readonly string[], opt?: ExecaOptions): ExecaChildProcess;
  spawn(command: string, args?: readonly string[], opt?: ExecaOptions<undefined>): ExecaChildProcess<Buffer>;
  spawn(
    this: BaseGenerator,
    command: string,
    args?: readonly string[],
    opt?: ExecaOptions<any>,
  ): ExecaChildProcess<any> {
    return execa(command, args, {
      stdio: 'inherit',
      cwd: this.destinationRoot(),
      ...opt,
    });
  }

  /**
   * Normalize a command across OS and spawn it (synchronously).
   *
   * @param command program to execute
   * @param opt execa options options
   * @see https://github.com/sindresorhus/execa#execacommandsynccommand-options
   */
  spawnCommandSync(command: string, opt?: SyncOptions): ExecaSyncReturnValue;
  spawnCommandSync(command: string, opt?: SyncOptions<undefined>): ExecaSyncReturnValue<Buffer>;
  /**
   * @deprecated use `spawnSync` for file with args execution
   * Normalize a command across OS and spawn it (synchronously).
   *
   * @param command program to execute
   * @param args list of arguments to pass to the program
   * @param opt execa options options
   */
  spawnCommandSync(command: string, args?: readonly string[], opt?: SyncOptions): ExecaSyncReturnValue;
  /**
   * @deprecated use `spawnSync` for file with args execution
   * Normalize a command across OS and spawn it (synchronously).
   *
   * @param command program to execute
   * @param args list of arguments to pass to the program
   * @param opt execa options options
   */
  spawnCommandSync(
    command: string,
    args?: readonly string[],
    opt?: SyncOptions<undefined>,
  ): ExecaSyncReturnValue<Buffer>;
  spawnCommandSync(
    this: BaseGenerator,
    command: string,
    args?: readonly string[] | SyncOptions,
    opt?: SyncOptions<any>,
  ): ExecaSyncReturnValue<any> {
    if (Array.isArray(args) || (opt && args === undefined)) {
      return this.spawnSync(command, args, opt);
    }

    return execaCommandSync(command, {
      stdio: 'inherit',
      cwd: this.destinationRoot(),
      ...args,
    });
  }

  /**
   * Normalize a command across OS and spawn it (synchronously).
   *
   * @param command program to execute
   * @param args list of arguments to pass to the program
   * @param opt execa options options
   * @see https://github.com/sindresorhus/execa#execafile-arguments-options
   */
  spawnSync(command: string, args?: readonly string[], opt?: SyncOptions): ExecaSyncReturnValue;
  spawnSync(command: string, args?: readonly string[], opt?: SyncOptions<undefined>): ExecaSyncReturnValue<Buffer>;
  spawnSync(
    this: BaseGenerator,
    command: string,
    args?: readonly string[],
    opt?: SyncOptions<any>,
  ): ExecaSyncReturnValue<any> {
    return execaSync(command, args, {
      stdio: 'inherit',
      cwd: this.destinationRoot(),
      ...opt,
    });
  }
}
