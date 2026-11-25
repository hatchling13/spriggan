import { Effect, Option } from 'effect';
import type { SyntaxDocument } from '../syntax/document.ts';
import { ParseError } from '../errors/model.ts';
import type { ResolvedOptions } from '../options.ts';
import { adapter } from './jsonc.ts';

const BOM_CHARACTER = '\uFEFF';

const WHITESPACE_CHARACTERS = [' ', '\t', '\r', '\n'] as const;

const isWhitespace = (input: string) => {
  const iterator = input[Symbol.iterator]();

  const first = iterator.next();

  if (first.done) {
    return true;
  }

  const character = first.value;

  if (
    character !== BOM_CHARACTER &&
    WHITESPACE_CHARACTERS.every((whitespace) => whitespace !== character)
  ) {
    return false;
  }

  for (const character of iterator) {
    if (WHITESPACE_CHARACTERS.some((whitespace) => character === whitespace)) {
      continue;
    }

    return false;
  }

  return true;
};

export const parseJSON = (
  input: string,
  mode: ResolvedOptions['mode'],
): Effect.Effect<Option.Option<SyntaxDocument>, ParseError> =>
  Effect.gen(function* () {
    if (isWhitespace(input)) {
      return Option.none<SyntaxDocument>();
    }

    const document = yield* adapter(input, mode);

    return Option.some(document);
  });
