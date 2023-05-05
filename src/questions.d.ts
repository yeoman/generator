import { type DistinctQuestion, type Answers as InquirerAnswers } from 'inquirer';
import type Storage from './util/storage.js';

/**
 * Represents a question.
 */
export type Question<T extends Answers = Answers> = DistinctQuestion<T> & {
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
export type QuestionRegistrationOptions<T extends Answers = Answers> = Question<T> & {
  /**
   * A value indicating whether an option should be exported for this question.
   */
  exportOption?: boolean | Record<string, unknown>;
};

/**
 * Represents an answer-hash.
 */
export type Answers = InquirerAnswers;

/**
 * Provides a set of questions.
 */
export type Questions<A extends Answers = Answers> = Question<A> | Array<Question<A>>; // | Observable<Question<A>>;
