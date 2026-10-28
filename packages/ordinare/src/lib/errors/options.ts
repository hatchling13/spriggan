import { Array, Effect, Match, Schema } from 'effect';
import type { BeautifyOptions } from '../options.ts';
import { InvalidOptionsError, OptionIssueSchema } from './model.ts';
import { collectSchemaIssues, type LocatedSchemaIssue } from './collect.ts';
import { makeExpectedPositiveIntegerIssueReason } from './reasons.ts';

const FieldsSchema = Schema.Tuple([
  Schema.Literals(['mode', 'indentation', 'printWidth', 'tabWidth']),
]);

const getFieldFromLocatedSchemaIssue = (issue: LocatedSchemaIssue) =>
  Schema.decodeUnknownEffect(FieldsSchema)(issue.path).pipe(
    Effect.catch(() =>
      Effect.die({
        message: 'Unexpected option issue path',
        ...issue,
      }),
    ),
    Effect.map(([field]) => field),
  );

const mapIssue = (options: BeautifyOptions) => (issue: LocatedSchemaIssue) =>
  getFieldFromLocatedSchemaIssue(issue).pipe(
    Effect.map((field) =>
      Match.value(field).pipe(
        Match.when('mode', (field) =>
          OptionIssueSchema.cases.InvalidModeChoice.make({
            field,
            reason: {
              expected: ['json', 'jsonc'],
              input: options[field],
            },
          }),
        ),
        Match.when('indentation', (field) =>
          OptionIssueSchema.cases.InvalidIndentationChoice.make({
            field,
            reason: {
              expected: ['two-spaces', 'four-spaces', 'tabs'],
              input: options[field],
            },
          }),
        ),
        Match.whenOr('printWidth', 'tabWidth', (field) =>
          OptionIssueSchema.cases.ExpectedPositiveInteger.make({
            field,
            reason: makeExpectedPositiveIntegerIssueReason(issue.issue),
          }),
        ),
        Match.exhaustive,
      ),
    ),
  );

export const mapToInvalidOptionsError = (
  options: BeautifyOptions,
  error: Schema.SchemaError,
) =>
  Effect.gen(function* () {
    const locatedIssues = collectSchemaIssues(error.issue);

    const issues = yield* Effect.forEach(locatedIssues, mapIssue(options));

    if (!Array.isArrayNonEmpty(issues)) {
      return yield* Effect.die({
        message: 'Expected at least one option issue',
      });
    }

    return InvalidOptionsError.make({
      issues,
      message: 'Invalid beautify options',
    });
  });
