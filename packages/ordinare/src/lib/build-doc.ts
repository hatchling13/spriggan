import { Match, Option } from 'effect';
import type { AttachedComment } from './comments.ts';
import { type Doc, DocSchema } from './doc.ts';
import type { SyntaxDocument } from './syntax/document.ts';
import type { SyntaxNode } from './syntax/node.ts';

export const buildDoc = (
  document: SyntaxDocument,
  attachments: readonly AttachedComment[],
): Doc => {
  const { Text, Concat, Line, Indent } = DocSchema.cases;

  const commentText = (attachment: AttachedComment): string => {
    const { start, end } = attachment.context.comment.range;
    return document.original.slice(start, end).replace(/\r\n?/g, '\n');
  };

  const commentDocs = (attachment: AttachedComment): readonly Doc[] => [
    Text.make({ text: commentText(attachment) }),
    Line.make({}),
  ];

  const leadingCommentDocs = (attachment: AttachedComment): readonly Doc[] => {
    const inline =
      attachment.context.comment.kind === 'block-comment' &&
      attachment.context.sameLineAsNext;

    return [
      Text.make({ text: commentText(attachment) }),
      inline ? Text.make({ text: ' ' }) : Line.make({}),
    ];
  };

  const trailingDocs = (
    comments: readonly AttachedComment[],
    followedBySeparator: boolean,
  ): readonly Doc[] => {
    const docs: Doc[] = [];

    for (const [index, attachment] of comments.entries()) {
      const previous = comments[index - 1];
      const sameLine =
        previous === undefined
          ? attachment.context.sameLineAsPrevious
          : !/[\r\n]/.test(
              document.original.slice(
                previous.context.comment.range.end,
                attachment.context.comment.range.start,
              ),
            );

      docs.push(
        sameLine ? Text.make({ text: ' ' }) : Line.make({}),
        Text.make({ text: commentText(attachment) }),
      );
    }

    const last = comments.at(-1);

    if (
      followedBySeparator &&
      last !== undefined &&
      (last.context.comment.kind === 'line-comment' ||
        !last.context.sameLineAsNext)
    ) {
      docs.push(Line.make({}));
    }

    return docs;
  };

  const buildEmptyContainer = (
    node: SyntaxNode,
    opening: string,
    closing: string,
  ): Doc => {
    const dangling = attachments.filter(
      (attachment) =>
        attachment._tag === 'Dangling' && attachment.target === node,
    );

    if (dangling.length === 0) {
      return Text.make({ text: opening + closing });
    }

    return Concat.make({
      docs: [
        Text.make({ text: opening }),
        Indent.make({
          doc: Concat.make({
            docs: [Line.make({}), ...dangling.flatMap(commentDocs)],
          }),
        }),
        Text.make({ text: closing }),
      ],
    });
  };

  const buildNode = (
    node: SyntaxNode,
    separator: '' | ',' | ': ' = '',
  ): Doc => {
    const body = Match.value(node).pipe(
      Match.tag('Null', 'Boolean', 'String', 'Number', ({ range }) =>
        Text.make({
          text: document.original.slice(range.start, range.end),
        }),
      ),
      Match.tag('Array', ({ elements }) => {
        if (elements.length === 0) {
          return buildEmptyContainer(node, '[', ']');
        }

        const contents: Doc[] = [];

        for (const [index, element] of elements.entries()) {
          if (index > 0) {
            contents.push(Line.make({}));
          }

          contents.push(
            buildNode(element, index < elements.length - 1 ? ',' : ''),
          );
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
          return buildEmptyContainer(node, '{', '}');
        }

        const contents: Doc[] = [];

        for (const [index, member] of members.entries()) {
          if (index > 0) {
            contents.push(Line.make({}));
          }

          contents.push(
            buildNode(member.key, ': '),
            buildNode(member.value, index < members.length - 1 ? ',' : ''),
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

    const leading = attachments.filter(
      (attachment) =>
        attachment._tag === 'Leading' && attachment.target === node,
    );

    const trailing = attachments.filter(
      (attachment) =>
        attachment._tag === 'Trailing' && attachment.target === node,
    );

    const separatorKind =
      separator === ',' ? 'comma' : separator === ': ' ? 'colon' : undefined;

    const beforeSeparator = trailing.filter(
      (attachment) =>
        separatorKind !== undefined &&
        Option.match(attachment.context.next, {
          onNone: () => false,
          onSome: (token) => token.kind === separatorKind,
        }),
    );

    const afterSeparator = trailing.filter(
      (attachment) => !beforeSeparator.includes(attachment),
    );

    return Concat.make({
      docs: [
        ...leading.flatMap(leadingCommentDocs),
        body,
        ...trailingDocs(beforeSeparator, true),
        Text.make({ text: separator }),
        ...trailingDocs(afterSeparator, false),
      ],
    });
  };

  const before = attachments.filter(
    (attachment) =>
      attachment._tag === 'Document' && attachment.side === 'before',
  );

  const after = attachments.filter(
    (attachment) =>
      attachment._tag === 'Document' && attachment.side === 'after',
  );

  return Concat.make({
    docs: [
      ...before.flatMap(commentDocs),
      buildNode(document.root),
      Line.make({}),
      ...after.flatMap(commentDocs),
    ],
  });
};
