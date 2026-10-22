import { Result, Effect } from 'effect';
import { type BeautifyOptions, parseOptions } from './options.ts';

const obj = {
  mode: 'json',
  indentation: 'two-spaces',
  printWidth: 100,
  tabWidth: 2,
};

const InvalidChoiceCases = [
  {
    options: { mode: 'yaml' },
    issue: {
      _tag: 'InvalidModeChoice',
      field: 'mode',
      reason: {
        expected: ['json', 'jsonc'],
        input: 'yaml',
      },
    },
  },
  {
    options: { mode: 'json', indentation: 'one-space' },
    issue: {
      _tag: 'InvalidIndentationChoice',
      field: 'indentation',
      reason: {
        expected: ['two-spaces', 'four-spaces', 'tabs'],
        input: 'one-space',
      },
    },
  },
] as const;

const PositiveIntegerCases = [
  {
    field: 'printWidth',
    input: 0,
    reason: { _tag: 'PositiveViolation', input: 0, boundary: 0 },
  },
  {
    field: 'printWidth',
    input: 0.5,
    reason: { _tag: 'IntegerViolation', input: 0.5 },
  },
  {
    field: 'tabWidth',
    input: -1,
    reason: { _tag: 'PositiveViolation', input: -1, boundary: 0 },
  },
  {
    field: 'printWidth',
    input: 'asdf',
    reason: { _tag: 'TypeMismatch', expected: 'number', input: 'asdf' },
  },
  {
    field: 'tabWidth',
    input: '1',
    reason: { _tag: 'TypeMismatch', expected: 'number', input: '1' },
  },
] as const;

const MultipleIssueCases = [
  {
    name: 'issues across multiple fields in order',
    options: { mode: 'json', printWidth: 0, tabWidth: 0.5 },
    issues: [
      {
        _tag: 'ExpectedPositiveInteger',
        field: 'printWidth',
        reason: { _tag: 'PositiveViolation', input: 0, boundary: 0 },
      },
      {
        _tag: 'ExpectedPositiveInteger',
        field: 'tabWidth',
        reason: { _tag: 'IntegerViolation', input: 0.5 },
      },
    ],
  },
  {
    name: 'multiple issues for the same field in order',
    options: { mode: 'json', printWidth: -0.5 },
    issues: [
      {
        _tag: 'ExpectedPositiveInteger',
        field: 'printWidth',
        reason: { _tag: 'IntegerViolation', input: -0.5 },
      },
      {
        _tag: 'ExpectedPositiveInteger',
        field: 'printWidth',
        reason: { _tag: 'PositiveViolation', input: -0.5, boundary: 0 },
      },
    ],
  },
] as const;

describe('parseOptions', () => {
  it('should work', async () => {
    const result = await Effect.runPromise(
      Effect.result(parseOptions({ mode: 'json' })),
    );

    expect(result).toEqual(Result.succeed(obj));
  });
  it.each(InvalidChoiceCases)(
    'reports $issue._tag',
    async ({ options, issue }) => {
      const error = await Effect.runPromise(
        Effect.flip(parseOptions(options as unknown as BeautifyOptions)),
      );

      expect(error._tag).toBe('InvalidOptionsError');
      expect(error.issues).toEqual([issue]);
    },
  );
  it.each(PositiveIntegerCases)(
    'reports $reason._tag for $field=$input',
    async ({ field, input, reason }) => {
      const error = await Effect.runPromise(
        Effect.flip(parseOptions({ mode: 'json', [field]: input })),
      );

      expect(error._tag).toBe('InvalidOptionsError');
      expect(error.issues).toEqual([
        {
          _tag: 'ExpectedPositiveInteger',
          field,
          reason,
        },
      ]);
    },
  );
  it.each(MultipleIssueCases)(
    'preserves $name',
    async ({ options, issues }) => {
      const error = await Effect.runPromise(Effect.flip(parseOptions(options)));

      expect(error._tag).toBe('InvalidOptionsError');
      expect(error.issues).toEqual(issues);
    },
  );
});
