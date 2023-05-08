import type Buffer from 'node:buffer';
import {
  execa,
  execaSync,
  type Options as ExecaOptions,
  type ExecaChildProcess,
  type SyncOptions,
  type ExecaSyncReturnValue,
} from 'execa';
import { GeneratorOrigin } from '../generator-parent.js';

export class SpawnCommandMixin extends GeneratorOrigin {
  /**
   * Normalize a command across OS and spawn it (asynchronously).
   *
   * @param command program to execute
   * @param args list of arguments to pass to the program
   * @param opt any cross-spawn options
   */
  spawnCommand(command: string, args?: readonly string[], opt?: ExecaOptions): ExecaChildProcess;
  spawnCommand(command: string, args?: readonly string[], opt?: ExecaOptions<undefined>): ExecaChildProcess<Buffer>;
  spawnCommand(command: string, args?: readonly string[], opt?: ExecaOptions<any>): ExecaChildProcess<any> {
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
   * @param args list of arguments to pass to the program
   * @param opt any cross-spawn options
   */
  spawnCommandSync(command: string, args?: readonly string[], opt?: SyncOptions): ExecaSyncReturnValue;
  spawnCommandSync(
    command: string,
    args?: readonly string[],
    opt?: SyncOptions<undefined>,
  ): ExecaSyncReturnValue<Buffer>;
  spawnCommandSync(command: string, args?: readonly string[], opt?: SyncOptions<any>): ExecaSyncReturnValue<any> {
    return execaSync(command, args, {
      stdio: 'inherit',
      cwd: this.destinationRoot(),
      ...opt,
    });
  }
}
