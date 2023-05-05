import process from 'node:process';
import githubUsername from 'github-username';
import { type SimpleGit, simpleGit } from 'simple-git';
import { type BaseGenerator } from '../generator.js';

type Constructor<T extends BaseGenerator> = new (...args: any[]) => T;

class GitUtil {
  #parent: { get simpleGit(): SimpleGit };

  constructor(parent: { get simpleGit(): SimpleGit }) {
    this.#parent = parent;
  }

  /**
   * Retrieves user's name from Git in the global scope or the project scope
   * (it'll take what Git will use in the current context)
   * @return {Promise<string>} configured git name or undefined
   */
  async name(): Promise<string | undefined> {
    const { value } = await this.#parent.simpleGit.getConfig('user.name');
    return value ?? undefined;
  }

  /**
   * Retrieves user's email from Git in the global scope or the project scope
   * (it'll take what Git will use in the current context)
   * @return {Promise<string>} configured git email or undefined
   */
  async email(): Promise<string | undefined> {
    const { value } = await this.#parent.simpleGit.getConfig('user.email');
    return value ?? undefined;
  }
}

export default function userMixin<Parent extends Constructor<BaseGenerator>>(parent: Parent) {
  return class GitMixin extends parent {
    #git?: GitUtil;
    #simpleGit?: SimpleGit;

    get simpleGit(): SimpleGit {
      if (!this.#simpleGit) {
        this.#simpleGit = simpleGit({ baseDir: this.destinationPath() }).env({
          ...process.env,
          // eslint-disable-next-line @typescript-eslint/naming-convention
          LANG: 'en',
        });
        this.on('destinationRootChange', () => {
          this.#simpleGit = undefined;
        });
      }

      return this.#simpleGit;
    }

    get git(): GitUtil {
      if (!this.#git) {
        this.#git = new GitUtil(this);
      }

      return this.#git;
    }

    get github() {
      return {
        /**
         * Retrieves GitHub's username from the GitHub API
         * @return Resolved with the GitHub username or rejected if unable to
         *                   get the information
         */
        username: async () => {
          const email = await this.git.email();
          return email ? githubUsername(email) : email;
        },
      };
    }
  };
}
