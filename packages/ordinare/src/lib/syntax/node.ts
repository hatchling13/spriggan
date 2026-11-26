import { Schema } from 'effect';
import { SourceRangeSchema } from './range.ts';
import type { SourceRange } from './range.ts';

export type SyntaxNode =
  | {
      readonly _tag: 'Null';
      readonly range: SourceRange;
    }
  | {
      readonly _tag: 'Boolean';
      readonly range: SourceRange;
    }
  | {
      readonly _tag: 'Number';
      readonly range: SourceRange;
    }
  | {
      readonly _tag: 'String';
      readonly range: SourceRange;
    }
  | {
      readonly _tag: 'Array';
      readonly range: SourceRange;
      readonly elements: readonly SyntaxNode[];
    }
  | {
      readonly _tag: 'Object';
      readonly range: SourceRange;
      readonly members: readonly {
        readonly key: Extract<SyntaxNode, { _tag: 'String' }>;
        readonly value: SyntaxNode;
      }[];
    };

const SyntaxStringNodeSchema = Schema.TaggedStruct('String', {
  range: SourceRangeSchema,
});

export const SyntaxNodeSchema = Schema.TaggedUnion({
  String: SyntaxStringNodeSchema.fields,
  Number: {
    range: SourceRangeSchema,
  },
  Boolean: {
    range: SourceRangeSchema,
  },
  Null: {
    range: SourceRangeSchema,
  },
  Array: {
    range: SourceRangeSchema,
    elements: Schema.Array(
      Schema.suspend((): Schema.Codec<SyntaxNode> => SyntaxNodeSchema),
    ),
  },
  Object: {
    range: SourceRangeSchema,
    members: Schema.Array(
      Schema.Struct({
        key: SyntaxStringNodeSchema,
        value: Schema.suspend((): Schema.Codec<SyntaxNode> => SyntaxNodeSchema),
      }),
    ),
  },
});
