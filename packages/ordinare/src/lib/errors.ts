import {
  Array,
  Effect,
  Match,
  Result,
  Schema,
  SchemaIssue,
  StandardSchema,
} from 'effect';

class ParseError extends Schema.TaggedError<ParseError>()('ParseError', {
  message: Schema.String,
}) {}

export const OptionIssueSchema = Schema.TaggedUnion({
  InvalidChoice: { field: Schema.Literals(['mode', 'indentation']) },
  ExpectedPositiveInteger: {
    field: Schema.Literals(['printWidth', 'tabWidth']),
  },
});

export type OptionIssue = typeof OptionIssueSchema.Type;

export class InvalidOptionsError extends Schema.TaggedError<InvalidOptionsError>()(
  'InvalidOptionsError',
  {
    message: Schema.String,
    issues: Schema.NonEmptyArray(OptionIssueSchema),
  },
) {}

const FieldsSchema = Schema.Tuple([
  Schema.Literals(['mode', 'indentation', 'printWidth', 'tabWidth']),
]);

const mapIssue = (issue: StandardSchema.StandardSchemaV1.Issue) =>
  Effect.gen(function* () {
    return yield* Result.match(
      Schema.decodeUnknownResult(FieldsSchema)(issue.path),
      {
        onSuccess: ([f]) =>
          Match.value(f).pipe(
            Match.whenOr('mode', 'indentation', (field) =>
              Effect.succeed(
                OptionIssueSchema.cases.InvalidChoice.make({ field }),
              ),
            ),
            Match.whenOr('printWidth', 'tabWidth', (field) =>
              Effect.succeed(
                OptionIssueSchema.cases.ExpectedPositiveInteger.make({ field }),
              ),
            ),
            Match.exhaustive,
          ),
        onFailure: (_left) =>
          Effect.die({
            // Do something
          }),
      },
    );
  });

export const mapToInvalidOptionsError = (error: Schema.SchemaError) =>
  Effect.gen(function* () {
    const rawIssues = SchemaIssue.makeFormatterStandardSchemaV1()(
      error.issue,
    ).issues;

    const mapped = yield* Effect.forEach(rawIssues, mapIssue);
    const deduped = Array.dedupeWith(mapped, (a, b) => a.field === b.field);
    const issues = yield* Effect.orDie(
      Schema.decodeUnknownEffect(Schema.NonEmptyArray(OptionIssueSchema))(
        deduped,
      ),
    );

    return InvalidOptionsError.make({ issues, message: '' });
  });

export const BeautifyErrorSchema = Schema.Union([
  ParseError,
  InvalidOptionsError,
]);

export type BeautifyError = typeof BeautifyErrorSchema.Type;
