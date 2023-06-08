import assert from 'node:assert';
import type { JSONSchema7Object } from 'json-schema';
import type { PromptAnswers, PromptQuestion } from '../questions.js';
import type Storage from './storage.js';

// eslint-disable-next-line @typescript-eslint/promise-function-async
const getChoices = <A extends PromptAnswers = PromptAnswers>(question: PromptQuestion<A>) => {
  if (question.type === 'list') {
    return question.choices;
  }

  if (question.type === 'checkbox') {
    return question.choices;
  }

  if (question.type === 'expand') {
    return question.choices;
  }

  if (question.type === 'rawlist') {
    return question.choices;
  }

  return undefined;
};

/**
 * Returns the default value for a checkbox
 *
 * @param question Inquirer prompt item
 * @param defaultValue  The stored default value
 * @return Default value to set
 * @private
 */
const getCheckboxDefault = (question: any, defaultValue: any) => {
  // For simplicity we uncheck all boxes and use .default to set the active ones
  for (const choice of question.choices) {
    if (typeof choice === 'object') {
      choice.checked = false;
    }
  }

  return defaultValue;
};

/**
 * Returns the default value for a list
 *
 * @param question    Inquirer prompt item
 * @param defaultValue     The stored default value
 * @return Default value to set
 * @private
 */
const getListDefault = (question: any, defaultValue: any) => {
  const choiceValues = question.choices.map((choice: any) => (typeof choice === 'object' ? choice.value : choice));
  return choiceValues.indexOf(defaultValue);
};

/**
 * Return true if the answer should be store in
 * the global store, otherwise false
 *
 * @param question Inquirer prompt item
 * @param answer   The inquirer answer
 * @param storeAll Should store default values
 * @return Answer to be stored
 * @private
 */
const storeListAnswer = (question: any, answer: PromptAnswers, storeAll: boolean) => {
  const choiceValues = question.choices.map((choice: any) => {
    if (Object.prototype.hasOwnProperty.call(choice, 'value')) {
      return choice.value;
    }

    return choice;
  });

  const choiceIndex = choiceValues.indexOf(answer);

  // Check if answer is not equal to default value
  if (storeAll || question.default !== choiceIndex) {
    return true;
  }

  return false;
};

/**
 * Return true if the answer should be store in
 * the global store, otherwise false
 *
 * @param question Inquirer prompt item
 * @param answer   The inquirer answer
 * @param storeAll Should store default values
 * @return Answer to be stored
 * @private
 */
const storeAnswer = (question: any, answer: PromptAnswers, storeAll: boolean) => {
  // Check if answer is not equal to default value or is undefined
  if (answer !== undefined && (storeAll || question.default !== answer)) {
    return true;
  }

  return false;
};

/**
 * Prefill the defaults with values from the global store
 *
 * @param store     `.yo-rc-global` global config
 * @param questions Original prompt questions
 * @return Prompt questions array with prefilled values.
 */
export const prefillQuestions = <A extends PromptAnswers = PromptAnswers>(
  store: Storage,
  questions: Array<PromptQuestion<A>>,
) => {
  assert(store, 'A store parameter is required');
  assert(questions, 'A questions parameter is required');

  const promptValues = store.get<any>('promptValues') ?? {};

  questions = [questions].flat();

  // Write user defaults back to prompt
  return questions.map(question => {
    if (question.store !== true) {
      return question;
    }

    const storedValue = promptValues[question.name as string];

    if (storedValue === undefined || typeof getChoices(question) === 'function') {
      // Do not override prompt default when question.choices is a function,
      // since can't guarantee that the `storedValue` will even be in the returned choices
      return question;
    }

    // Override prompt default with the user's default
    switch (question.type) {
      case 'rawlist':
      case 'expand': {
        question.default = getListDefault(question, storedValue);
        break;
      }

      case 'checkbox': {
        question.default = getCheckboxDefault(question, storedValue);
        break;
      }

      default: {
        question.default = storedValue;
        break;
      }
    }

    return question;
  });
};

/**
 * Store the answers in the global store
 *
 * @param store     `.yo-rc-global` global config
 * @param questions Original prompt questions
 * @param answers   The inquirer answers
 * @param storeAll  Should store default values
 */
export const storeAnswers = (store: Storage, questions: any, answers: PromptAnswers, storeAll: boolean) => {
  assert(store, 'A store parameter is required');
  assert(answers, 'A answers parameter is required');
  assert(questions, 'A questions parameter is required');
  assert.ok(typeof answers === 'object', 'answers must be a object');

  storeAll = storeAll || false;
  const promptValues = store.get<JSONSchema7Object>('promptValues') ?? {};

  questions = [questions].flat();

  for (const question of questions) {
    if (question.store !== true) {
      return;
    }

    let saveAnswer;
    const key = question.name;
    const answer = answers[key];

    switch (question.type) {
      case 'rawlist':
      case 'expand': {
        saveAnswer = storeListAnswer(question, answer, storeAll);
        break;
      }

      default: {
        saveAnswer = storeAnswer(question, answer, storeAll);
        break;
      }
    }

    if (saveAnswer) {
      promptValues[key] = answer;
    }
  }

  if (Object.keys(promptValues).length > 0) {
    store.set('promptValues', promptValues);
  }
};
