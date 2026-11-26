import { Match } from 'effect';
import type { Doc } from './doc.ts';
import type { ResolvedOptions } from './options.ts';

export const printDoc = (doc: Doc, options: ResolvedOptions): string => {
  const indentation = {
    'two-spaces': '  ',
    'four-spaces': '    ',
    tabs: '\t',
  }[options.indentation];

  const chunks: string[] = [];
  let lineStart = true;

  const visit = (doc: Doc, depth: number) => {
    Match.value(doc).pipe(
      Match.tag('Text', ({ text }) => {
        if (text.length === 0) {
          return;
        }

        if (lineStart) {
          chunks.push(indentation.repeat(depth));
        }

        chunks.push(text);
        lineStart = false;
      }),
      Match.tag('Line', () => {
        chunks.push('\n');
        lineStart = true;
      }),
      Match.tag('Concat', ({ docs }) => {
        for (const child of docs) {
          visit(child, depth);
        }
      }),
      Match.tag('Indent', ({ doc }) => {
        visit(doc, depth + 1);
      }),
      Match.exhaustive,
    );
  };

  visit(doc, 0);

  return chunks.join('');
};
