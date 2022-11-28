import process from 'node:process';
import githubUsername from 'github-username';
import { simpleGit } from 'simple-git';

class GitUtil {
  #parent;

  constructor(parent) {
    this.#parent = parent;
  }

  /**
   * Retrieves user's name from Git in the global scope or the project scope
   * (it'll take what Git will use in the current context)
   * @return {Promise<string>} configured git name or undefined
   */
  async name() {
    const { value } = await this.#parent.simpleGit.getConfig('user.name');
    return value;
  }

  /**
   * Retrieves user's email from Git in the global scope or the project scope
   * (it'll take what Git will use in the current context)
   * @return {Promise<string>} configured git email or undefined
   */
  async email() {
    const { value } = await this.#parent.simpleGit.getConfig('user.email');
    return value;
  }
}

const userMixin = Parent =>
  class GitMixin extends Parent {
    #git;
    #simpleGit;

    /**
     * @return {import('simple-git').SimpleGit}
     */
    get simpleGit() {
      if (!this.#simpleGit) {
        this.#simpleGit = simpleGit({ baseDir: this.destinationPath() }).env({
          ...process.env,
          LANG: 'en',
        });
        this.on('destinationRootChange', () => {
          this.#simpleGit = undefined;
        });
      }

      return this.#simpleGit;
    }

    get git() {
      if (!this.#git) {
        this.#git = new GitUtil(this);
      }

      return this.#git;
    }

    get github() {
      return {
        /**
         * Retrieves GitHub's username from the GitHub API
         * @return {Promise} Resolved with the GitHub username or rejected if unable to
         *                   get the information
         */
        username: async () => githubUsername(await this.git.email()),
      };
    }
  };

export default userMixin;
