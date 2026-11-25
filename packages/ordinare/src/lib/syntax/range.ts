import { Schema } from 'effect';

export const SourceRangeSchema = Schema.Struct({
  start: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  end: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
});

export type SourceRange = typeof SourceRangeSchema.Type;
