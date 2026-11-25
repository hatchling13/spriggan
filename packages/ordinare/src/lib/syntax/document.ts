import { Schema } from 'effect';
import { SyntaxNodeSchema } from './node.ts';
import { SyntaxTokenSchema } from './token.ts';

export const SyntaxDocumentSchema = Schema.Struct({
  original: Schema.String,
  root: SyntaxNodeSchema,
  tokens: Schema.Array(SyntaxTokenSchema),
});

export type SyntaxDocument = typeof SyntaxDocumentSchema.Type;
