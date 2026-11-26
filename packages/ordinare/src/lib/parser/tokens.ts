import { createScanner, type SyntaxKind } from 'jsonc-parser';
import type { SyntaxToken } from '../syntax/token.ts';

// jsonc-parser 3.3.1 declares an ambient const enum.
// Keep its numeric codes inside the adapter.
const tokenKinds: Partial<Record<SyntaxKind, SyntaxToken['kind']>> = {
  1: 'brace-open',
  2: 'brace-close',
  3: 'bracket-open',
  4: 'bracket-close',
  5: 'comma',
  6: 'colon',
  7: 'null',
  8: 'boolean',
  9: 'boolean',
  10: 'string',
  11: 'number',
  12: 'line-comment',
  13: 'block-comment',
};

// Whitespace, line breaks, unknown input, and EOF have no syntax-token kind.
// The scanner loop handles those cases before constructing a token.
export const fromKindToTokenKind = (
  kind: SyntaxKind,
): SyntaxToken['kind'] | undefined => tokenKinds[kind];

/**
 * `SyntaxKind.LineBreakTrivia`
 */
export const LINE_BREAK_TRIVIA_CODE = 14 as const;

/**
 * `SyntaxKind.Trivia`
 */
export const TRIVIA_CODE = 15 as const;

/**
 * `SyntaxKind.EOF`
 */
export const EOF_CODE = 17 as const;

export function* scanTokens(input: string) {
  const scanner = createScanner(input, false);

  for (let kind = scanner.scan(); kind !== EOF_CODE; kind = scanner.scan()) {
    yield {
      kind,
      offset: scanner.getTokenOffset(),
      length: scanner.getTokenLength(),
    };
  }
}
