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
});
