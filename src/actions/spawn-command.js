import {execa, execaSync} from 'execa';

const spawnCommandMixin = (Parent) =>
  class SpawnCommandMixin extends Parent {
    /**
     * Normalize a command across OS and spawn it (asynchronously).
     *
     * @param {String} command program to execute
     * @param {Array} args list of arguments to pass to the program
     * @param {object} [opt] any cross-spawn options
     * @return {String} spawned process reference
     */
    spawnCommand(command, args, opt) {
      return execa(command, args, {
        stdio: 'inherit',
        cwd: this.destinationRoot(),
        ...opt,
      });
    }

    /**
     * Normalize a command across OS and spawn it (synchronously).
     *
     * @param {String} command program to execute
     * @param {Array} args list of arguments to pass to the program
     * @param {object} [opt] any cross-spawn options
     * @return {String} spawn.sync result
     */
    spawnCommandSync(command, args, opt) {
      return execaSync(command, args, {
        stdio: 'inherit',
        cwd: this.destinationRoot(),
        ...opt,
      });
    }
  };

export default spawnCommandMixin;
