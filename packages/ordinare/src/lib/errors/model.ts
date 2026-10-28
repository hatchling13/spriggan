import { Schema } from 'effect';

export class ParseError extends Schema.TaggedError<ParseError>()('ParseError', {
  message: Schema.String,
}) {}

export const InvalidModeChoiceIssueReasonSchema = Schema.Struct({
  expected: Schema.NonEmptyArray(Schema.Literals(['json', 'jsonc'])),
  input: Schema.Unknown,
});

export const InvalidIndentationChoiceIssueReasonSchema = Schema.Struct({
  expected: Schema.NonEmptyArray(
    Schema.Literals(['two-spaces', 'four-spaces', 'tabs']),
  ),
  input: Schema.Unknown,
});

export const ExpectedPositiveIntegerIssueReasonSchema = Schema.TaggedUnion({
  TypeMismatch: {
    expected: Schema.Literal('number'),
    input: Schema.Unknown,
  },
  IntegerViolation: {
    input: Schema.Number,
  },
  PositiveViolation: {
    boundary: Schema.Number,
    input: Schema.Number,
  },
  Unclassified: {
    message: Schema.String,
    input: Schema.optional(Schema.Unknown),
  },
});

export type ExpectedPositiveIntegerIssueReason =
  typeof ExpectedPositiveIntegerIssueReasonSchema.Type;

export const OptionIssueSchema = Schema.TaggedUnion({
  InvalidModeChoice: {
    field: Schema.Literal('mode'),
    reason: InvalidModeChoiceIssueReasonSchema,
  },
  InvalidIndentationChoice: {
    field: Schema.Literal('indentation'),
    reason: InvalidIndentationChoiceIssueReasonSchema,
  },
  ExpectedPositiveInteger: {
    field: Schema.Literals(['printWidth', 'tabWidth']),
    reason: ExpectedPositiveIntegerIssueReasonSchema,
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

export const BeautifyErrorSchema = Schema.Union([
  ParseError,
  InvalidOptionsError,
]);

export type BeautifyError = typeof BeautifyErrorSchema.Type;
