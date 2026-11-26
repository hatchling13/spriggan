import { Match } from 'effect';
import { type Doc, DocSchema } from './doc.ts';
import type { SyntaxDocument } from './syntax/document.ts';
import type { SyntaxNode } from './syntax/node.ts';

export const buildDoc = (document: SyntaxDocument): Doc => {
  const buildNode = (node: SyntaxNode): Doc => {
    const { Text, Concat, Line, Indent } = DocSchema.cases;

    return Match.value(node).pipe(
      Match.tag('Null', 'Boolean', 'String', 'Number', ({ range }) =>
        Text.make({
          text: document.original.slice(range.start, range.end),
        }),
      ),
      Match.tag('Array', ({ elements }) => {
        if (elements.length === 0) {
          return Text.make({ text: '[]' });
        }

        const contents: Doc[] = [];

        for (const [index, element] of elements.entries()) {
          if (index > 0) {
            contents.push(Text.make({ text: ',' }), Line.make({}));
          }

          contents.push(buildNode(element));
        }

        return Concat.make({
          docs: [
            Text.make({ text: '[' }),
            Indent.make({
              doc: Concat.make({
                docs: [Line.make({}), ...contents],
              }),
            }),
            Line.make({}),
            Text.make({ text: ']' }),
          ],
        });
      }),
      Match.tag('Object', ({ members }) => {
        if (members.length === 0) {
          return Text.make({ text: '{}' });
        }

        const contents: Doc[] = [];

        for (const [index, member] of members.entries()) {
          if (index > 0) {
            contents.push(Text.make({ text: ',' }), Line.make({}));
          }

          contents.push(
            buildNode(member.key),
            Text.make({ text: ': ' }),
            buildNode(member.value),
          );
        }

        return Concat.make({
          docs: [
            Text.make({ text: '{' }),
            Indent.make({
              doc: Concat.make({
                docs: [Line.make({}), ...contents],
              }),
            }),
            Line.make({}),
            Text.make({ text: '}' }),
          ],
        });
      }),
      Match.exhaustive,
    );
  };

  return DocSchema.cases.Concat.make({
    docs: [buildNode(document.root), DocSchema.cases.Line.make({})],
  });
};
