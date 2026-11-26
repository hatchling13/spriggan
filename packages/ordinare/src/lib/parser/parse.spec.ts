import { Effect, Option } from 'effect';
import { parseJSON } from './parse.ts';

describe('parseJSON BOM handling', () => {
  it.each(['json', 'jsonc'] as const)(
    'preserves original node and token ranges in %s mode',
    async (mode) => {
      const original = '\uFEFF{"a":[1]}';
      const result = await Effect.runPromise(parseJSON(original, mode));

      expect(result).toEqual(
        Option.some({
          original,
          root: {
            _tag: 'Object',
            range: { start: 1, end: 10 },
            members: [
              {
                key: { _tag: 'String', range: { start: 2, end: 5 } },
                value: {
                  _tag: 'Array',
                  range: { start: 6, end: 9 },
                  elements: [{ _tag: 'Number', range: { start: 7, end: 8 } }],
                },
              },
            ],
          },
          tokens: [
            { kind: 'brace-open', range: { start: 1, end: 2 } },
            { kind: 'string', range: { start: 2, end: 5 } },
            { kind: 'colon', range: { start: 5, end: 6 } },
            { kind: 'bracket-open', range: { start: 6, end: 7 } },
            { kind: 'number', range: { start: 7, end: 8 } },
            { kind: 'bracket-close', range: { start: 8, end: 9 } },
            { kind: 'brace-close', range: { start: 9, end: 10 } },
          ],
        }),
      );
    },
  );

  it.each(['json', 'jsonc'] as const)(
    'preserves U+FEFF inside a string in %s mode',
    async (mode) => {
      const original = '\uFEFF"\uFEFF"';
      const result = await Effect.runPromise(parseJSON(original, mode));

      expect(result).toEqual(
        Option.some({
          original,
          root: { _tag: 'String', range: { start: 1, end: 4 } },
          tokens: [{ kind: 'string', range: { start: 1, end: 4 } }],
        }),
      );
    },
  );

  it('preserves U+FEFF inside a JSONC comment', async () => {
    const original = '\uFEFF/*\uFEFF*/null';
    const result = await Effect.runPromise(parseJSON(original, 'jsonc'));

    expect(result).toEqual(
      Option.some({
        original,
        root: { _tag: 'Null', range: { start: 6, end: 10 } },
        tokens: [
          { kind: 'block-comment', range: { start: 1, end: 6 } },
          { kind: 'null', range: { start: 6, end: 10 } },
        ],
      }),
    );
  });

  it.each([
    { input: '\uFEFF', name: 'a BOM alone' },
    { input: '\uFEFF \t\r\n', name: 'a BOM followed by JSON whitespace' },
  ])('returns none for $name', async ({ input }) => {
    expect(await Effect.runPromise(parseJSON(input, 'json'))).toEqual(
      Option.none(),
    );
  });

  it.each([
    { input: '\uFEFF\uFEFFnull', name: 'repeated leading BOMs' },
    { input: ' \uFEFFnull', name: 'a BOM after whitespace' },
    { input: 'null\uFEFF', name: 'a BOM after the root value' },
    { input: '\uFEFF\uFEFF', name: 'a repeated BOM without a root' },
  ])('rejects $name in both modes', async ({ input }) => {
    const errors = await Effect.runPromise(
      Effect.forEach(['json', 'jsonc'] as const, (mode) =>
        Effect.flip(parseJSON(input, mode)),
      ),
    );

    expect(errors.map((error) => error._tag)).toEqual([
      'ParseError',
      'ParseError',
    ]);
  });
});
