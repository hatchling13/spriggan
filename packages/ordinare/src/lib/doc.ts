import { Schema } from 'effect';

export type Doc =
  | {
      readonly _tag: 'Text';
      readonly text: string;
    }
  | {
      readonly _tag: 'Concat';
      readonly docs: readonly Doc[];
    }
  | {
      readonly _tag: 'Line';
    }
  | {
      readonly _tag: 'Indent';
      readonly doc: Doc;
    };

export const DocSchema = Schema.TaggedUnion({
  Text: {
    text: Schema.String,
  },
  Concat: {
    docs: Schema.Array(Schema.suspend((): Schema.Codec<Doc> => DocSchema)),
  },
  Line: {},
  Indent: {
    doc: Schema.suspend((): Schema.Codec<Doc> => DocSchema),
  },
});
