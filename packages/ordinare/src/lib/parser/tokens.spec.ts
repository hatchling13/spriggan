import { createScanner } from 'jsonc-parser';
import { fromKindToTokenKind } from './tokens.ts';

const TokenCases = [
  { input: '{', kind: 'brace-open' },
  { input: '}', kind: 'brace-close' },
  { input: '[', kind: 'bracket-open' },
  { input: ']', kind: 'bracket-close' },
  { input: ',', kind: 'comma' },
  { input: ':', kind: 'colon' },
  { input: 'null', kind: 'null' },
  { input: 'true', kind: 'boolean' },
  { input: 'false', kind: 'boolean' },
  { input: '"text"', kind: 'string' },
  { input: '123', kind: 'number' },
  { input: '// comment', kind: 'line-comment' },
  { input: '/* comment */', kind: 'block-comment' },
] as const;

describe('fromKindToTokenKind', () => {
  it.each(TokenCases)('maps $input to $kind', ({ input, kind }) => {
    const scanner = createScanner(input, false);

    expect(fromKindToTokenKind(scanner.scan())).toBe(kind);
  });

  it.each([
    { input: ' ', name: 'whitespace' },
    { input: '\r\n', name: 'line break' },
    { input: '?', name: 'unknown input' },
    { input: '', name: 'EOF' },
  ])('has no syntax-token kind for $name', ({ input }) => {
    const scanner = createScanner(input, false);

    expect(fromKindToTokenKind(scanner.scan())).toBeUndefined();
  });
});
