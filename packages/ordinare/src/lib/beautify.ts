import { Effect, Option } from 'effect';
import { buildDoc } from './build-doc.ts';
import { attachComments } from './comments.ts';
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

    if (Option.isNone(document)) {
      return Option.none<string>();
    }

    const attachments = yield* attachComments(document.value);
    const doc = buildDoc(document.value, attachments);

    return Option.some(printDoc(doc, resolved));
  });
