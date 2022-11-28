import process from 'node:process';
import shell from 'shelljs';
import githubUsername from 'github-username';

const nameCache = new Map();
const emailCache = new Map();

class GitUtil {
  #parent;

  constructor(parent) {
    this.#parent = parent;
  }

  /**
   * Retrieves user's name from Git in the global scope or the project scope
   * (it'll take what Git will use in the current context)
   * @return {String} configured git name or undefined
   */
  name() {
    let name = nameCache.get(process.cwd());

    if (name) {
      return name;
    }

    if (shell.which('git')) {
      name = shell
        .exec('git config --get user.name', { silent: true })
        .stdout.trim();
      nameCache.set(process.cwd(), name);
    }

    return name;
  }

  /**
   * Retrieves user's email from Git in the global scope or the project scope
   * (it'll take what Git will use in the current context)
   * @return {String} configured git email or undefined
   */
  email() {
    let email = emailCache.get(process.cwd());

    if (email) {
      return email;
    }

    if (shell.which('git')) {
      email = shell
        .exec('git config --get user.email', { silent: true })
        .stdout.trim();
      emailCache.set(process.cwd(), email);
    }

    return email;
  }
}

const userMixin = Parent =>
  class GitMixin extends Parent {
    #git;

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
        username: () => githubUsername(this.git.email()),
      };
    }
  };

export default userMixin;
