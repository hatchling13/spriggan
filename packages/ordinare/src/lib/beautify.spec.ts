import { Effect, Option } from 'effect';
import { beautify } from './beautify.ts';

describe('beautify', () => {
  it('prints nested objects and arrays', async () => {
    const result = await Effect.runPromise(
      beautify('{"a":[1,2]}', { mode: 'json' }),
    );

    expect(result).toEqual(Option.some('{\n  "a": [\n    1,\n    2\n  ]\n}\n'));
  });

  it.each(['', ' \t\r\n'])(
    'returns none for empty or whitespace-only input %j',
    async (source) => {
      const result = await Effect.runPromise(
        beautify(source, { mode: 'json' }),
      );

      expect(result).toEqual(Option.none());
    },
  );

  it.each([
    {
      source: '{',
      options: { mode: 'json' },
      tag: 'ParseError',
    },
    {
      source: '',
      options: { mode: 'json', printWidth: 0 },
      tag: 'InvalidOptionsError',
    },
  ] as const)('fails with $tag', async ({ source, options, tag }) => {
    const error = await Effect.runPromise(
      Effect.flip(beautify(source, options)),
    );

    expect(error._tag).toBe(tag);
  });

  it.each([
    {
      name: 'document comments',
      source: '// head\n1\n// tail',
      expected: '// head\n1\n// tail\n',
    },
    {
      name: 'leading member comment',
      source: '{// name\n"a":1}',
      expected: '{\n  // name\n  "a": 1\n}\n',
    },
    {
      name: 'dangling object comment',
      source: '{/* inside */}',
      expected: '{\n  /* inside */\n}\n',
    },
    {
      name: 'dangling array comment',
      source: '[// inside\n]',
      expected: '[\n  // inside\n]\n',
    },
    {
      name: 'trailing line comment',
      source: '{"a":1 // tail\n}',
      expected: '{\n  "a": 1 // tail\n}\n',
    },
    {
      name: 'comment after a comma',
      source: '{"a":1, // first\n"b":2}',
      expected: '{\n  "a": 1, // first\n  "b": 2\n}\n',
    },
    {
      name: 'comment before a colon',
      source: '{"a" /* key */:1}',
      expected: '{\n  "a" /* key */: 1\n}\n',
    },
    {
      name: 'comment after a colon',
      source: '{"a":/* value */1}',
      expected: '{\n  "a": /* value */ 1\n}\n',
    },
    {
      name: 'comment before a comma',
      source: '{"a":1 /* first */,"b":2}',
      expected: '{\n  "a": 1 /* first */,\n  "b": 2\n}\n',
    },
    {
      name: 'consecutive leading comments',
      source: '{// first\n// second\n"a":1}',
      expected: '{\n  // first\n  // second\n  "a": 1\n}\n',
    },
    {
      name: 'consecutive trailing block comments',
      source: '{"a":1 /* A */ /* B */}',
      expected: '{\n  "a": 1 /* A */ /* B */\n}\n',
    },
    {
      name: 'comments on both sides of a comma',
      source: '{"a":1 /* A */, /* B */\n"b":2}',
      expected: '{\n  "a": 1 /* A */, /* B */\n  "b": 2\n}\n',
    },
    {
      name: 'nested container comments',
      source: '{"outer":{/* inner */}}',
      expected: '{\n  "outer": {\n    /* inner */\n  }\n}\n',
    },
    {
      name: 'CRLF inside a block comment',
      source: '{/* first\r\n second */}',
      expected: '{\n  /* first\n second */\n}\n',
    },
    {
      name: 'line comment before a comma',
      source: '{"a":1 // first\n,"b":2}',
      expected: '{\n  "a": 1 // first\n  ,\n  "b": 2\n}\n',
    },
  ])('preserves $name', async ({ source, expected }) => {
    const result = await Effect.runPromise(beautify(source, { mode: 'jsonc' }));

    expect(result).toEqual(Option.some(expected));

    const repeated = await Effect.runPromise(
      beautify(expected, { mode: 'jsonc' }),
    );

    expect(repeated).toEqual(result);
  });
});
