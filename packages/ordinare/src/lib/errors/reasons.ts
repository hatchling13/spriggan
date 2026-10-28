import { Match, Result, Schema, SchemaIssue } from 'effect';
import {
  type ExpectedPositiveIntegerIssueReason,
  ExpectedPositiveIntegerIssueReasonSchema,
} from './model.ts';

const getUnclassified = (issue: SchemaIssue.Issue) =>
  ExpectedPositiveIntegerIssueReasonSchema.cases.Unclassified.make({
    ...(SchemaIssue.hasInput(issue) ? { input: issue['input'] } : {}),
    message: SchemaIssue.makeFormatterDefault()(issue),
  });

const integerViolationPattern = {
  input: Match.number,
  representation: { id: 'effect/schema/isInt' } as const,
};

const positiveViolationPattern = {
  input: Match.number,
  representation: { id: 'effect/schema/isGreaterThan' } as const,
};

const BoundarySchema = Schema.Struct({
  exclusiveMinimum: Schema.Number,
});

const parsePositiveViolation = (input: number, payload: unknown) =>
  Schema.decodeUnknownResult(BoundarySchema)(payload).pipe(
    Result.map(({ exclusiveMinimum }) =>
      ExpectedPositiveIntegerIssueReasonSchema.cases.PositiveViolation.make({
        input,
        boundary: exclusiveMinimum,
      }),
    ),
  );

const getReasonFromFilter = (
  issue: SchemaIssue.Filter,
): ExpectedPositiveIntegerIssueReason =>
  Match.value({
    input: issue.input,
    representation: issue.filter.annotations?.representation,
  }).pipe(
    Match.when(integerViolationPattern, ({ input }) =>
      ExpectedPositiveIntegerIssueReasonSchema.cases.IntegerViolation.make({
        input,
      }),
    ),
    Match.when(
      positiveViolationPattern,
      ({ input, representation: { payload } }) =>
        Result.getOrElse(parsePositiveViolation(input, payload), () =>
          getUnclassified(issue),
        ),
    ),
    Match.orElse(() => getUnclassified(issue)),
  );

const getReasonFromAnyOf = (issue: SchemaIssue.AnyOf) =>
  Match.value(issue.input).pipe(
    Match.whenOr(Match.number, Match.undefined, () => getUnclassified(issue)),
    Match.orElse(() =>
      ExpectedPositiveIntegerIssueReasonSchema.cases.TypeMismatch.make({
        expected: 'number',
        input: issue.input,
      }),
    ),
  );

export const makeExpectedPositiveIntegerIssueReason = (
  issue: SchemaIssue.Issue,
): ExpectedPositiveIntegerIssueReason =>
  Match.value(issue).pipe(
    Match.tag('Filter', getReasonFromFilter),
    Match.tag('AnyOf', getReasonFromAnyOf),
    Match.orElse(getUnclassified),
  );
