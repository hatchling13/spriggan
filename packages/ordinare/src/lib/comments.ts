import { Effect, Option } from 'effect';
import type { SyntaxDocument } from './syntax/document.ts';
import type { SyntaxToken } from './syntax/token.ts';
import type { SyntaxNode } from './syntax/node.ts';
import type { SourceRange } from './syntax/range.ts';

export type CommentToken = SyntaxToken & {
  readonly kind: 'line-comment' | 'block-comment';
};

const isCommentToken = (token: SyntaxToken): token is CommentToken =>
  token.kind === 'line-comment' || token.kind === 'block-comment';

export const collectComments = (
  document: SyntaxDocument,
): readonly CommentToken[] => document.tokens.filter(isCommentToken);

const hasLineBreak = (source: string, start: number, end: number): boolean =>
  /[\r\n]/.test(source.slice(start, end));

export type CommentContext = {
  readonly comment: CommentToken;
  readonly previous: Option.Option<SyntaxToken>;
  readonly next: Option.Option<SyntaxToken>;
  readonly sameLineAsPrevious: boolean;
  readonly sameLineAsNext: boolean;
};

export const collectCommentContexts = (
  document: SyntaxDocument,
): readonly CommentContext[] => {
  const contexts: CommentContext[] = [];
  const pending: CommentToken[] = [];
  let previous: Option.Option<SyntaxToken> = Option.none();

  const flushPending = (next: Option.Option<SyntaxToken>): void => {
    for (const comment of pending) {
      contexts.push({
        comment,
        previous,
        next,
        sameLineAsPrevious: Option.match(previous, {
          onNone: () => false,
          onSome: (token) =>
            !hasLineBreak(
              document.original,
              token.range.end,
              comment.range.start,
            ),
        }),
        sameLineAsNext: Option.match(next, {
          onNone: () => false,
          onSome: (token) =>
            !hasLineBreak(
              document.original,
              comment.range.end,
              token.range.start,
            ),
        }),
      });
    }

    pending.length = 0;
  };

  for (const token of document.tokens) {
    if (isCommentToken(token)) {
      pending.push(token);
      continue;
    }

    flushPending(Option.some(token));
    previous = Option.some(token);
  }

  flushPending(Option.none());

  return contexts;
};

type ContainerNode = Extract<SyntaxNode, { _tag: 'Array' | 'Object' }>;

const findContainingContainer = (
  node: SyntaxNode,
  range: SourceRange,
): Option.Option<ContainerNode> => {
  if (
    (node._tag !== 'Array' && node._tag !== 'Object') ||
    node.range.start > range.start ||
    node.range.end < range.end
  ) {
    return Option.none();
  }

  const children =
    node._tag === 'Array'
      ? node.elements
      : node.members.map(({ value }) => value);

  for (const child of children) {
    const found = findContainingContainer(child, range);

    if (Option.isSome(found)) {
      return found;
    }
  }

  return Option.some(node);
};

export type AttachedComment =
  | {
      readonly _tag: 'Leading' | 'Trailing';
      readonly context: CommentContext;
      readonly target: SyntaxNode;
    }
  | {
      readonly _tag: 'Dangling';
      readonly context: CommentContext;
      readonly target: ContainerNode;
    }
  | {
      readonly _tag: 'Document';
      readonly context: CommentContext;
      readonly side: 'before' | 'after';
    };

type ContainerItem = {
  readonly leadingTarget: SyntaxNode;
  readonly trailingTarget: SyntaxNode;
};

const getContainerItems = (
  container: ContainerNode,
): readonly ContainerItem[] =>
  container._tag === 'Array'
    ? container.elements.map((node) => ({
        leadingTarget: node,
        trailingTarget: node,
      }))
    : container.members.map(({ key, value }) => ({
        leadingTarget: key,
        trailingTarget: value,
      }));

const attachToContainer = (
  container: ContainerNode,
  context: CommentContext,
): Effect.Effect<AttachedComment> => {
  const items = getContainerItems(container);
  const first = items[0];

  if (first === undefined) {
    return Effect.succeed({
      _tag: 'Dangling',
      context,
      target: container,
    });
  }

  if (context.comment.range.end <= first.leadingTarget.range.start) {
    return Effect.succeed({
      _tag: 'Leading',
      context,
      target: first.leadingTarget,
    });
  }

  if (container._tag === 'Object') {
    for (const { key, value } of container.members) {
      const range = context.comment.range;
      const betweenKeyAndValue =
        key.range.end <= range.start && range.end <= value.range.start;

      if (!betweenKeyAndValue) {
        continue;
      }

      const beforeColon = Option.match(context.next, {
        onNone: () => false,
        onSome: (token) => token.kind === 'colon',
      });

      return Effect.succeed({
        _tag: beforeColon ? 'Trailing' : 'Leading',
        context,
        target: beforeColon ? key : value,
      });
    }
  }

  for (const [index, item] of items.entries()) {
    const next = items[index + 1];
    const range = context.comment.range;

    const afterItem = item.trailingTarget.range.end <= range.start;
    const beforeNext =
      next === undefined || range.end <= next.leadingTarget.range.start;

    if (!afterItem || !beforeNext) {
      continue;
    }

    const beforeComma = Option.match(context.next, {
      onNone: () => false,
      onSome: (token) => token.kind === 'comma',
    });

    if (next !== undefined && !context.sameLineAsPrevious && !beforeComma) {
      return Effect.succeed({
        _tag: 'Leading',
        context,
        target: next.leadingTarget,
      });
    }

    return Effect.succeed({
      _tag: 'Trailing',
      context,
      target: item.trailingTarget,
    });
  }

  return Effect.die({
    message: 'Remaining container comment placements are not implemented',
    context,
    container,
  });
};

export const attachComments = (
  document: SyntaxDocument,
): Effect.Effect<readonly AttachedComment[]> =>
  Effect.forEach(
    collectCommentContexts(document),
    (context): Effect.Effect<AttachedComment> => {
      const range = context.comment.range;
      const rootRange = document.root.range;

      if (range.end <= rootRange.start) {
        return Effect.succeed({
          _tag: 'Document',
          context,
          side: 'before',
        });
      }

      if (range.start >= rootRange.end) {
        return Effect.succeed({
          _tag: 'Document',
          context,
          side: 'after',
        });
      }

      const container = findContainingContainer(document.root, range);

      return Option.match(container, {
        onNone: () =>
          Effect.die({
            message: 'Comment has no containing container',
            context,
          }),
        onSome: (target) => attachToContainer(target, context),
      });
    },
  );
