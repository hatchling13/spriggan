import { Schema, Result } from 'effect';
import { BeautifyOptionsSchema } from './options.ts';

describe('BeautifyOptionsSchema', () => {
  it('should work', () => {
    expect(
      Schema.decodeResult(BeautifyOptionsSchema)({ mode: 'json' }),
    ).toEqual(
      Result.succeed({
        mode: 'json',
        indentation: 'two-spaces',
        printWidth: 100,
        tabWidth: 2,
      }),
    );
  });
});
