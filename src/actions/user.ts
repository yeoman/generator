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

export abstract class GitMixin {
  _git?: GitUtil;
  _simpleGit?: SimpleGit;

  get simpleGit(): SimpleGit {
    if (!this._simpleGit) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      this._simpleGit = simpleGit({ baseDir: this.destinationPath() }).env({
        ...process.env,
        // eslint-disable-next-line @typescript-eslint/naming-convention
        LANG: 'en',
      });
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error
      this.on('destinationRootChange', () => {
        this._simpleGit = undefined;
      });
    }

    return this._simpleGit;
  }

  get git(): GitUtil {
    if (!this._git) {
      this._git = new GitUtil(this);
    }

    return this._git;
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
}
