import { Schema } from 'effect';
import { SourceRangeSchema } from './range.ts';

export const SyntaxTokenSchema = Schema.Struct({
  kind: Schema.Literals([
    'null',
    'boolean',
    'number',
    'string',
    'brace-open', // '{'
    'brace-close', // '}'
    'bracket-open', // '['
    'bracket-close', // ']'
    'colon', // ':'
    'comma', // ','
    'line-comment', // '//'
    'block-comment', // '/* */'
  ]),
  range: SourceRangeSchema,
});

export type SyntaxToken = typeof SyntaxTokenSchema.Type;
