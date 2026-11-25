import { Effect, Match } from 'effect';
import { parseTree } from 'jsonc-parser';
import type {
  Node as JsoncNode,
  ParseError as JsoncParseError,
} from 'jsonc-parser';
import type { ResolvedOptions } from '../options.ts';
import { ParseError } from '../errors/model.ts';
import { SyntaxNodeSchema, type SyntaxNode } from '../syntax/node.ts';
import type { SourceRange } from '../syntax/range.ts';
import { SyntaxTokenSchema, type SyntaxToken } from '../syntax/token.ts';
import {
  fromKindToTokenKind,
  LINE_BREAK_TRIVIA_CODE,
  scanTokens,
  TRIVIA_CODE,
} from './tokens.ts';
import type { SyntaxDocument } from '../syntax/document.ts';

const toRange = (node: JsoncNode): SourceRange => ({
  start: node.offset,
  end: node.offset + node.length,
});

const convertArray = (
  node: JsoncNode,
  convertChild: (node: JsoncNode) => Effect.Effect<SyntaxNode>,
) => {
  const children = node.children;

  if (children === undefined) {
    return Effect.die({
      message: 'Array node is missing children',
      node,
    });
  }

  return Effect.forEach(children, convertChild).pipe(
    Effect.map((elements) =>
      SyntaxNodeSchema.cases.Array.make({ range: toRange(node), elements }),
    ),
  );
};

const convertObject = (
  node: JsoncNode,
  convertChild: (node: JsoncNode) => Effect.Effect<SyntaxNode>,
) => {
  const children = node.children;

  if (children === undefined) {
    return Effect.die({
      message: 'Object node is missing children',
      node,
    });
  }

  return Effect.forEach(children, (property) =>
    Effect.gen(function* () {
      const parts = property.children;
      const key = parts?.[0];
      const value = parts?.[1];

      if (
        property.type !== 'property' ||
        parts?.length !== 2 ||
        key?.type !== 'string' ||
        value === undefined
      ) {
        return yield* Effect.die({
          message: 'Unexpected object member structure',
          node: property,
        });
      }

      const convertedValue = yield* convertChild(value);

      return {
        key: SyntaxNodeSchema.cases.String.make({
          range: toRange(key),
        }),
        value: convertedValue,
      };
    }),
  ).pipe(
    Effect.map((members) =>
      SyntaxNodeSchema.cases.Object.make({ range: toRange(node), members }),
    ),
  );
};

const convert = (node: JsoncNode): Effect.Effect<SyntaxNode> =>
  Effect.gen(function* () {
    const range = toRange(node);

    const converted = Match.value(node.type).pipe(
      Match.when('null', () =>
        Effect.succeed(SyntaxNodeSchema.cases.Null.make({ range })),
      ),
      Match.when('boolean', () =>
        Effect.succeed(SyntaxNodeSchema.cases.Boolean.make({ range })),
      ),
      Match.when('number', () =>
        Effect.succeed(SyntaxNodeSchema.cases.Number.make({ range })),
      ),
      Match.when('string', () =>
        Effect.succeed(SyntaxNodeSchema.cases.String.make({ range })),
      ),
      Match.when('array', () => convertArray(node, convert)),
      Match.when('object', () => convertObject(node, convert)),
      Match.orElse(() => Effect.die('Unhandled value')),
    );

    return yield* converted;
  });

const collectTokens = (input: string) =>
  Effect.gen(function* () {
    const tokens: SyntaxToken[] = [];

    for (const token of scanTokens(input)) {
      if (token.kind === TRIVIA_CODE || token.kind === LINE_BREAK_TRIVIA_CODE) {
        continue;
      }

      const kind = fromKindToTokenKind(token.kind);

      if (kind === undefined) {
        return yield* Effect.die({
          message: 'Unexpected scanner token kind',
          token,
        });
      }

      const syntaxToken = SyntaxTokenSchema.make({
        kind,
        range: {
          start: token.offset,
          end: token.offset + token.length,
        },
      });

      tokens.push(syntaxToken);
    }

    return tokens;
  });

export const adapter = (
  input: string,
  mode: ResolvedOptions['mode'],
): Effect.Effect<SyntaxDocument, ParseError> =>
  Effect.gen(function* () {
    // Keep every parser/scanner offset aligned with the original UTF-16 source.
    const parserInput = input.startsWith('\uFEFF')
      ? ' ' + input.slice(1)
      : input;
    const errors: JsoncParseError[] = [];

    const parsed = parseTree(parserInput, errors, {
      allowEmptyContent: false,
      allowTrailingComma: mode !== 'json',
      disallowComments: mode === 'json',
    });

    if (errors.length > 0 || parsed === undefined) {
      return yield* Effect.fail(
        ParseError.make({ message: 'Invalid JSON source' }),
      );
    }

    const root = yield* convert(parsed);
    const tokens = yield* collectTokens(parserInput);

    return {
      original: input,
      root,
      tokens,
    };
  });
