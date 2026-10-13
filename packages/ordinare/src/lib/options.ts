import { Effect, Schema } from 'effect';
import {
  type InvalidOptionsError,
  mapToInvalidOptionsError,
} from './errors.ts';

const PositiveIntegerSchema = Schema.Int.check(Schema.isGreaterThan(0)).pipe(
  Schema.brand('PositiveInteger'),
);

export type PositiveInteger = typeof PositiveIntegerSchema.Type;

export const BeautifyOptionsSchema = Schema.Struct({
  mode: Schema.Literals(['json', 'jsonc']),
  indentation: Schema.Literals(['two-spaces', 'four-spaces', 'tabs']).pipe(
    Schema.withDecodingDefault(Effect.succeed('two-spaces')),
  ),
  printWidth: PositiveIntegerSchema.pipe(
    Schema.withDecodingDefault(Effect.succeed(100)),
  ),
  tabWidth: PositiveIntegerSchema.pipe(
    Schema.withDecodingDefault(Effect.succeed(2)),
  ),
});

export type BeautifyOptions = typeof BeautifyOptionsSchema.Encoded;
export type ResolvedOptions = typeof BeautifyOptionsSchema.Type;

export const SourceRangeSchema = Schema.Struct({
  start: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
  end: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
});

export const parseOptions: (
  options: BeautifyOptions,
) => Effect.Effect<ResolvedOptions, InvalidOptionsError> = (
  options: BeautifyOptions,
) =>
  Schema.decodeEffect(BeautifyOptionsSchema)(options).pipe(
    Effect.catch((error) =>
      Effect.flatMap(mapToInvalidOptionsError(error), Effect.fail),
    ),
  );
