import { Effect, Option } from 'effect';
import { buildDoc } from './build-doc.ts';
import type { BeautifyError } from './errors/model.ts';
import { parseOptions, type BeautifyOptions } from './options.ts';
import { parseJSON } from './parser/parse.ts';
import { printDoc } from './printer.ts';

export const beautify = (
  source: string,
  options: BeautifyOptions,
): Effect.Effect<Option.Option<string>, BeautifyError> =>
  Effect.gen(function* () {
    const resolved = yield* parseOptions(options);
    const document = yield* parseJSON(source, resolved.mode);

    return Option.map(document, (document) =>
      printDoc(buildDoc(document), resolved),
    );
  });
