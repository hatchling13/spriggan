# Ordinare architecture contracts

This document records the agreed public API and internal stage guarantees that
guide engine implementation. Observable formatting rules live in
[policies.md](policies.md); concrete examples live in
[fixtures](../tests/fixtures/README.md).

## Implementation status

Options parsing, error normalization, source parsing, and a basic Doc/printer
pipeline are implemented. The package entry point exports `beautify` and the
`BeautifyOptions` and `BeautifyError` types. Internal stage functions and syntax
models remain within the package. The current output supports basic indentation
and a final LF. Comment attachment, blank-line preservation, and width-dependent
layout are upcoming stages described by the contracts below.

`apps/web` consumes this entry point through a workspace dependency. Its minimal
screen supports JSON/JSONC mode, indentation, explicit execution, output, and
summary errors. The screen identifies the prototype's current comment omission
and remaining layout work.

Option errors are split by responsibility under `src/lib/errors/`: `model.ts`
defines diagnostic schemas, `collect.ts` locates individual Schema issues,
`reasons.ts` interprets numeric failure reasons, and `options.ts` maps field paths
and assembles `InvalidOptionsError`.

The syntax model lives under `src/lib/syntax/`: `range.ts` defines source ranges,
`node.ts` defines recursive value nodes, `token.ts` defines token kinds and ranges,
and `document.ts` combines the original source, root, and ordered tokens.

Under `src/lib/parser/`, `parse.ts` handles empty input and the
`Effect<Option<SyntaxDocument>, ParseError>` boundary. `jsonc.ts` selects JSON or
JSONC grammar settings, checks parser errors, converts the tree, collects tokens,
and builds the document. `tokens.ts` isolates scanner-code mapping and lazy token
iteration. A leading BOM is replaced with one space in the parsing-only view;
the original source and all UTF-16 offsets remain intact.

Parser tests currently cover scanner-code mapping and BOM behavior, including
node, key, comment, and token ranges, neutral BOM-only input, U+FEFF inside strings
and comments, and rejection of repeated or misplaced BOMs. Broader contract tests
for mode differences, duplicate keys, number and escape spellings, empty input,
syntax errors, and CRLF coordinates are upcoming verification work. The formatting
fixtures remain ready for integration as the remaining pipeline stages are built.

## Parse, don't validate

Convert external values into internal values that carry the guarantees established
at the boundary. Preserve validation knowledge in the types and values passed
through the rest of the pipeline.

```text
External options -> parseOptions -> ResolvedOptions
Original source + mode -> parser adapter -> Option<SyntaxDocument>
```

Successful conversion creates a valid internal value; failed conversion follows
the error path. Downstream stages rely on the guarantees established at this
construction boundary.

Use types to express valid states where practical. Validated values acquire their
guarantees through controlled construction, with brands carrying those guarantees
in their types. Establish relationships such as a range belonging to a particular
source at a boundary that knows that source. Construction checks and contract
tests complement the relationships expressed in types.

## Public API

The agreed API shape is:

```ts
import type { Effect, Option } from 'effect';

type BeautifyOptions = {
  readonly mode: 'json' | 'jsonc';
  readonly indentation?: 'two-spaces' | 'four-spaces' | 'tabs';
  readonly printWidth?: number;
  readonly tabWidth?: number;
};

type BeautifyError = ParseError | InvalidOptionsError;

type Beautify = (
  source: string,
  options: BeautifyOptions,
) => Effect.Effect<Option.Option<string>, BeautifyError>;
```

These declarations illustrate the agreed API boundary and use the error contracts
described below. `InvalidOptionsError` is implemented as a
`Schema.TaggedError` with a summary message and a non-empty issue list.
`ParseError` uses its tag and a summary message for the initial beautifier scope.

| Outcome                                   | Representation                                     |
| ----------------------------------------- | -------------------------------------------------- |
| Formatted output                          | `Option.some(text)` in the success channel         |
| Empty or whitespace-only input            | `Option.none()` in the success channel             |
| Invalid input syntax                      | `ParseError` in the typed failure channel          |
| Invalid output options                    | `InvalidOptionsError` in the typed failure channel |
| Implementation bug or invariant violation | Defect, distinct from user input errors            |

The caller runs the returned Effect. The engine returns an Effect with an explicit
typed error channel. The adapter boundary provides parser replaceability; service
and Layer exposure remain implementation choices.

## Errors and source ranges

The initial error contracts support completion of the beautifier pipeline.
`ParseError` identifies a source-parsing failure through `_tag: 'ParseError'` and
an explanatory `message`. `InvalidOptionsError` contains at least one issue
identifying the offending option and violated rule. The option-issue contract is
defined below.

### Parse failures

The parsing boundary returns a complete valid document, the neutral empty-input
outcome, or a typed `ParseError`. Any parser-reported syntax error produces
`ParseError`, including when the parser also produces a recovered tree. Formatting
continues only with successfully parsed documents.

The adapter interprets parser diagnostics and produces a summary message. Parser
codes, diagnostic collections, and recovery representations stay within that
boundary. Source-parsing tests assert the typed failure outcome and `ParseError`
tag; messages provide explanatory context.

Detailed parse diagnostics are a future extension driven by consumer needs.
Possible additions include source ranges, classified reasons, and multiple
diagnostics. Their payloads and collection policies can be designed at that stage
while retaining the parser adapter boundary. Original-source ranges in successful
documents support accurate formatting and retain their existing contract.

### Option error collection and normalization

Collect all available option diagnostics across invalid fields. Normalize
individual diagnostics into engine-owned issues. The current broad
classifications are:

| Issue kind                 | Option fields            |
| -------------------------- | ------------------------ |
| `InvalidModeChoice`        | `mode`                   |
| `InvalidIndentationChoice` | `indentation`            |
| `ExpectedPositiveInteger`  | `printWidth`, `tabWidth` |

Choice reasons contain the expected choices and the supplied `input`. Keeping
mode and indentation as separate cases preserves the relationship between each
field and its expected choices.

Numeric reasons form a tagged union:

| Reason              | Detail fields                 |
| ------------------- | ----------------------------- |
| `TypeMismatch`      | `expected: 'number'`, `input` |
| `IntegerViolation`  | numeric `input`               |
| `PositiveViolation` | numeric `input`, `boundary`   |
| `Unclassified`      | `message`, optional `input`   |

Numeric rule classification uses structured filter identifiers. The greater-than
filter payload is parsed with a Schema before its boundary enters the diagnostic.
Type mismatches are interpreted in the context of the numeric width options.
Unclassified diagnostics retain the source issue's formatted explanation and
include `input` when the source issue reports that property, including an explicit
`undefined` value.

Interpret each diagnostic path before constructing an issue. The current options
are flat, so an accepted path contains exactly one of the four field names above.
A missing, empty, nested, or unrecognized path follows the mapping invariant
violation path.

Flatten external diagnostic trees into engine-owned issues. The public contract
consists of each resulting diagnostic's field, violated rule, and explanatory
detail; external tree structure stays within the normalization boundary. Each
issue carries its broad classification together with the diagnostic detail
defined above.

Retain individual diagnostics, including those sharing a field or broad issue
kind. Preserve their order and count after flattening. The UI may group diagnostics
in its presentation while retaining the engine result. The engine-owned flat
diagnostics define the preservation scope. The original `SchemaError` may serve
as an optional internal debugging cause.

The resulting list contains at least one issue. Internally constructed issues
retain their types through collection; a non-empty-array guard establishes the
list invariant. An empty list follows the mapping invariant violation path.
Mapping invariant violations enter the defect channel.

The normalization operation produces an `InvalidOptionsError` as its successful
value. The options-parsing boundary then places that value in its typed failure
channel. Each stage consumes the preceding Effect's successful value. Defects from
normalization remain in the defect channel.

Messages explain failures; structured fields and rules determine classification.
Give option errors a useful summary and mapping defects enough context to identify
the unexpected path or violated invariant. Diagnostic messages may be retained as
explanatory detail. Use field paths and structured rules for classification, and
structured issue information for test assertions. Exact messages and stack traces
serve as explanatory and debugging data.

### Option error verification

Options-parsing tests must cover a single invalid option and multiple invalid
fields in one call. Verify that failures use `InvalidOptionsError`, contain every
affected field, and use the issue kinds above.

Normalization tests must verify that multiple diagnostics for the same field are
retained, including their order, count, and explanatory detail. Also cover
rejection of unexpected paths and empty issue lists as defects. Keep these
contract tests separate from source-formatting fixtures. Assert observable
outcomes across implementations of the contract.

Current tests cover default resolution, both choice-error kinds, numeric rule
violations, type mismatches, multiple invalid fields, and multiple diagnostics for
one field. They compare complete issue arrays to verify structured details, order,
and count. Dedicated fallback, unexpected-path, and empty-list tests remain
upcoming verification work. Expected-failure tests use `Effect.flip` before
execution so unexpected success or a defect fails the test.

### Source ranges

```ts
type SourceRange = {
  readonly start: number; // UTF-16, inclusive
  readonly end: number; // UTF-16, exclusive
};
```

Ranges satisfy `0 <= start <= end <= source.length` and refer to the same original
JavaScript string as the document. A zero-length range can identify an EOF
position. A leading BOM remains part of this coordinate system even when omitted
from formatted output. Display line/column numbers may be derived separately.

The current `SourceRangeSchema` establishes non-negative integer endpoints.
Endpoint ordering and ownership within a source will be established at the
source-parsing construction boundary.

These source ranges support token preservation and layout in successfully parsed
documents. Future diagnostic ranges can use the same coordinate convention.
External parser nodes and diagnostic representations stay inside the adapter.
Malformed user input enters the typed failure channel; implementation bugs enter
the defect channel.

## Pipeline

```text
BeautifyOptions
  -> parseOptions
  -> ResolvedOptions

Original source + resolved mode
  -> parser adapter
  -> Option<SyntaxDocument>
  -> comment attachment, when a document exists
  -> CommentedDocument
  -> Doc construction with ResolvedOptions
  -> Doc
  -> printer with ResolvedOptions
  -> formatted string
```

Options are parsed before the empty-input branch. Invalid options therefore fail
even when the source is empty. An absent document produces the neutral result and
skips comment attachment, Doc construction, and printing.

### 1. Options parsing

```text
BeautifyOptions
  -> Effect<ResolvedOptions, InvalidOptionsError>
```

- Require an explicit valid input mode.
- Apply defaults to omitted options and explicit `undefined` values: two-space
  indentation, width 100, tab width 2.
- Route invalid choices and widths to `InvalidOptionsError`, preserving the
  supplied values through validation.
- Widths are finite positive integers.
- Produce a new value and preserve the caller's options unchanged.
- Every resolved option is present and carries its validation guarantees for
  downstream consumers.

The internal shape has required `mode`, `indentation`, `printWidth`, and `tabWidth`
fields. `BeautifyOptionsSchema.Encoded` defines the caller's input type, and
`BeautifyOptionsSchema.Type` defines `ResolvedOptions`. Decoding defaults resolve
the optional fields. Widths use `Schema.Int`, a greater-than-zero check, and the
`PositiveInteger` brand to carry the established guarantee downstream.

### 2. Source parsing

```text
Original source + InputMode
  -> Effect<Option<SyntaxDocument>, ParseError>
```

- Return `Option.none()` for empty or permitted-whitespace-only input.
- Otherwise require a valid complete document with exactly one root value.
- Route documents with parser diagnostics to the typed failure channel, including
  those with a recovered tree.
- Retain the original source, engine-owned tree, token and comment ranges,
  punctuation information, and relevant whitespace/blank-line information.
- Preserve object member order and duplicates.
- Ensure all source ranges are valid and refer to this document's original source.
- Record comment locations for attachment in the next stage.

Initially use Microsoft's `jsonc-parser` behind an adapter. Convert its syntax
types, options, and coordinates at that boundary, and interpret parser diagnostics
as the `ParseError` outcome described above. Preserve source-token spellings for
output through their original source ranges.

#### Syntax document

`SyntaxDocument` owns the original source string, a node tree with exactly one
root value, and a document-wide token list. Preserve the original source exactly,
including a leading BOM and CRLF line endings. Empty or permitted-whitespace-only
input follows the `Option.none()` outcome at the parsing boundary.

The tree expresses value relationships:

- Objects contain an ordered list of members, preserving duplicate keys.
- Each member contains a string key and a value.
- Arrays contain an ordered list of values.
- Scalar nodes distinguish strings, numbers, booleans, and null, and retain their
  original source ranges.

Original token spellings remain available through source ranges. Numeric nodes
can represent their source tokens independently of JavaScript numeric conversion.

#### Node and token ranges

All ranges use UTF-16 code units in the same original source, with an inclusive
start and exclusive end. A value node spans the value itself. Object and array
ranges include their opening and closing delimiters. Surrounding whitespace,
comments, and a following comma are represented by the document's token list and
the source gaps between tokens.

The token list covers the whole document in source order, including value tokens,
comments, and punctuation such as braces, brackets, colons, and commas. Leading,
trailing, and container-internal comments retain their own ranges. The leading
BOM remains in the original source. The adapter replaces a single U+FEFF at offset
zero with one U+0020 space in a parsing-only view. Both `parseTree` and the scanner
consume that same view. Its UTF-16 length and line endings match the original, so
node, key, comment, and token ranges refer directly to the original source.
`SyntaxDocument.original` retains the caller's exact input. The replacement space
is omitted from the token list as layout whitespace.

Only the first character receives this treatment. Additional or misplaced BOMs
remain subject to the selected grammar, and U+FEFF within strings and comments
retains its original spelling. The empty-input check permits one leading BOM and
otherwise accepts only JSON whitespace: space, tab, CR, and LF.

The tree and token list are related through their original source ranges. Shared
token objects or token indices on nodes can be introduced when a concrete
consumer requires them. Comment attachment targets are established in the next
stage.

#### Whitespace and blank lines

The original source and token ranges are the authoritative representation of
whitespace. Derive layout whitespace and blank lines from source gaps between
adjacent tokens, including comments and punctuation, and from the document
boundary gaps. The syntax document stores the information needed for this
derivation through its source and ranges.

Treat CRLF as one line break while retaining the original source coordinates.
Line breaks within a comment belong to that comment's range; gaps around the
comment determine surrounding layout whitespace. Blank-line counts are derived
when needed. A future cache may store those derived results while keeping the
original source and ranges authoritative.

### 3. Comment attachment

```text
SyntaxDocument -> CommentedDocument
```

This pure stage retains the syntax document and adds attachment information,
preserving the source, tree, and comment text unchanged.

| Relationship | Meaning                                                             |
| ------------ | ------------------------------------------------------------------- |
| Leading      | A comment before the item it describes                              |
| Trailing     | A comment after its item, retaining whether it was on the same line |
| Dangling     | A comment attached directly to a container                          |
| Document     | A comment before or after the root value                            |

Every comment has exactly one attachment; its target exists in the same document.
Preserve original ranges, order, and relevant blank-line information. Empty
containers can contain comments, and comment attachments survive comma removal.

Concrete target identities, relationship type names, and the attachment algorithm
are deferred. Ambiguous examples are settled with Oxfmt reference fixtures.
Failure to process a valid document is an internal invariant violation handled as
a defect.

### 4. Doc construction

```text
CommentedDocument + ResolvedOptions -> Doc
```

This pure stage constructs layout commands and alternatives for the printer.

- Obtain token spellings from original source ranges.
- Include every comment exactly once.
- Omit trailing commas.
- Encode the agreed blank-line and comment-placement policies.
- Represent indentation and line-break decisions for the printer.
- Leave final width-dependent placement to the printer.

The concrete Doc algebra remains an implementation choice. Failures here indicate
an internal invariant violation handled as a defect.

### 5. Printing

```text
Doc + ResolvedOptions -> string
```

The printer is pure and deterministic. It chooses layout using display width and
tab stops, applies indentation, and treats tokens and comment content as intact
units even when they exceed the target width. It preserves token spellings and
block-comment internal spacing, normalizes actual line endings to LF, and produces
exactly one final LF.

A malformed Doc is an internal invariant violation handled as a defect. Earlier
parsing stages handle user input errors. Whole-engine contract tests verify
reparsing, preservation, and idempotence. Runtime reparsing remains optional.

## Stable architecture identifiers

These identifiers retain their meaning from the policy document.

| ID       | Contract                                                                                                                                  |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| ARCH-001 | Keep `jsonc-parser` types, callbacks, recovery state, error codes, and defaults within the adapter boundary.                              |
| ARCH-002 | Retain original source, tree structure, token/comment ranges, punctuation, and relevant whitespace information in the engine-owned model. |
| ARCH-003 | Use original-source UTF-16 ranges with an inclusive start and exclusive end. Convert other parser conventions at the adapter boundary.    |
| ARCH-004 | Keep source coordinates separate from character segmentation and display-width measurement.                                               |
| ARCH-005 | Use Effect at execution/error boundaries; keep internal transformation and printing stages pure and deterministic.                        |
| ARCH-006 | A replacement parser must preserve this contract and pass the same fixtures.                                                              |

## Deferred implementation choices

- Exact syntax type declarations, attachment identities, and Doc representations,
  following the document, node, and token contracts above.
- Construction boundaries and validated representations for source syntax,
  comment attachments, and Doc values.
- Detailed parse diagnostics as a future extension: kinds, ranges, payloads, and
  collection policies, when a consumer requires them.
- Display-width algorithm, Unicode rules, and supporting library.
- Parser adapter implementation and comment attachment algorithm.
- Fixture loader and contract test harness.

Choose these while implementing the contracts. Keep observable decisions in
[policies.md](policies.md) and concrete expected behavior in the fixtures.
