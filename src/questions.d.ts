import type { PromptAnswers, PromptQuestion as PromptQuestionApi } from '@yeoman/types';
import type Storage from './util/storage.js';

export type { PromptAnswers } from '@yeoman/types';

/**
 * Represents a question.
 */
export type PromptQuestion<T extends PromptAnswers = PromptAnswers> = PromptQuestionApi<T> & {
  name: string;

  /**
   * The storage to store the answer.
   */
  storage?: Storage;

  /**
   * A value indicating whether to store the user's previous answer for others projects.
   */
  store?: boolean;
};

/**
 * Provides options for registering a prompt.
 */
export type QuestionRegistrationOptions<T extends PromptAnswers = PromptAnswers> = PromptQuestion<T> & {
  /**
   * A value indicating whether an option should be exported for this question.
   */
  exportOption?: boolean | Record<string, unknown>;
};

/**
 * Provides a set of questions.
 */
export type PromptQuestions<A extends PromptAnswers = PromptAnswers> = PromptQuestion<A> | Array<PromptQuestion<A>>; // | Observable<Question<A>>;
