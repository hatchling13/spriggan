# Ordinare architecture contracts

This document records the agreed public API and internal stage guarantees. It is
a design contract, not a claim that the scaffold implements the engine. Observable
formatting rules live in [policies.md](policies.md); concrete examples live in
[fixtures](../tests/fixtures/README.md).

## Parse, don't validate

Convert external values into internal values that carry the guarantees established
at the boundary. Do not validate a value, discard that knowledge, and pass the same
unrestricted value through the rest of the pipeline.

```text
External options -> parseOptions -> ResolvedOptions
Original source + mode -> parser adapter -> SyntaxDocument or no input
```

If conversion fails, the corresponding valid internal value is not created.
Downstream stages may rely on its guarantees without repeating boundary checks.

Use types to rule out impossible states where practical. A brand or type assertion
alone does not establish validity: validated values need controlled construction.
Relationships such as a range belonging to a particular source must be established
at a boundary that knows that source. Types need not encode every relationship;
construction checks and contract tests complement them.

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

The error names refer to the contracts below. Their constructors and concrete
representations remain implementation choices. These declarations describe the
boundary, not a source file ready to compile on its own.

| Outcome                                   | Representation                                     |
| ----------------------------------------- | -------------------------------------------------- |
| Formatted output                          | `Option.some(text)` in the success channel         |
| Empty or whitespace-only input            | `Option.none()` in the success channel             |
| Invalid input syntax                      | `ParseError` in the typed failure channel          |
| Invalid output options                    | `InvalidOptionsError` in the typed failure channel |
| Implementation bug or invariant violation | Defect, distinct from user input errors            |

The caller runs the returned Effect. The engine does not execute its own public
Effect or return a Promise that hides the typed error channel. There is no need to
expose parser services or Layers merely to keep the parser replaceable.

## Errors and source ranges

`ParseError` contains at least one engine-owned diagnostic. Each diagnostic has an
engine-owned kind and an original source range. `InvalidOptionsError` contains at
least one issue identifying the offending option and violated rule. Exact kind
lists, payload types, and ordering are not yet finalized.

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

Do not expose external parser nodes, error codes, messages, or stack traces as the
diagnostic contract. Do not convert every unexpected exception into `ParseError`;
that would disguise engine bugs as malformed user input.

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
- Apply defaults only to omitted options: two-space indentation, width 100, tab
  width 2.
- Reject invalid choices and widths. Do not silently clamp or coerce them.
- Widths are finite positive integers.
- Produce a new value without modifying the caller's options.
- Every resolved option is present. Downstream consumers do not revalidate it.

The internal shape has required `mode`, `indentation`, `printWidth`, and `tabWidth`
fields. Validated widths have a representation that carries their positive-integer
guarantee; the branding or Schema mechanism is deferred.

### 2. Source parsing

```text
Original source + InputMode
  -> Effect<Option<SyntaxDocument>, ParseError>
```

- Return no document for empty or permitted-whitespace-only input.
- Otherwise require a valid complete document with exactly one root value.
- Reject error-recovered trees as successful documents.
- Retain the original source, engine-owned tree, token and comment ranges,
  punctuation information, and relevant whitespace/blank-line information.
- Preserve object member order and duplicates.
- Ensure all source ranges are valid and refer to this document's original source.
- Record comments without deciding their attachment targets at this stage.

Initially use Microsoft's `jsonc-parser` behind an adapter. Convert its types,
diagnostics, options, and coordinates at that boundary. Parsing need not decode
source tokens into values used for output.

### 3. Comment attachment

```text
SyntaxDocument -> CommentedDocument
```

This pure stage retains the syntax document and adds attachment information.
It does not rewrite the source, tree, or comment text.

| Relationship | Meaning                                                             |
| ------------ | ------------------------------------------------------------------- |
| Leading      | A comment before the item it describes                              |
| Trailing     | A comment after its item, retaining whether it was on the same line |
| Dangling     | A container-internal comment not attached to a specific item        |
| Document     | A comment before or after the root value                            |

Every comment has exactly one attachment; its target exists in the same document.
Preserve original ranges, order, and relevant blank-line information. Empty
containers can contain comments, and removing a comma must not detach a comment.

Concrete target identities, relationship type names, and the attachment algorithm
are deferred. Ambiguous examples are settled with Oxfmt reference fixtures.
Failure to process a valid document is an internal invariant violation, not a new
user-facing parse error.

### 4. Doc construction

```text
CommentedDocument + ResolvedOptions -> Doc
```

This pure stage represents layout commands and alternatives rather than directly
building the final output string.

- Obtain token spellings from original source ranges.
- Include every comment exactly once.
- Omit trailing commas.
- Encode the agreed blank-line and comment-placement policies.
- Represent indentation and line-break decisions for the printer.
- Leave final width-dependent placement to the printer.

The concrete Doc algebra is not selected yet. Failures here indicate an internal
invariant violation rather than malformed user input.

### 5. Printing

```text
Doc + ResolvedOptions -> string
```

The printer is pure and deterministic. It chooses layout using display width and
tab stops, applies indentation, and never splits tokens or comment content to
meet the target width. It preserves token spellings and block-comment internal
spacing, normalizes actual line endings to LF, and produces exactly one final LF.

It does not report user input errors. A malformed Doc is an internal invariant
violation. Reparsing, preservation, and idempotence are verified by whole-engine
contract tests, not by mandatory reparsing on every formatting operation.

## Stable architecture identifiers

These identifiers were moved from the policy document without changing their
meaning.

| ID       | Contract                                                                                                                                  |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| ARCH-001 | Isolate `jsonc-parser` behind an adapter. External types, callbacks, recovery state, error codes, and defaults do not escape it.          |
| ARCH-002 | Retain original source, tree structure, token/comment ranges, punctuation, and relevant whitespace information in the engine-owned model. |
| ARCH-003 | Use original-source UTF-16 ranges with an inclusive start and exclusive end. Convert other parser conventions at the adapter boundary.    |
| ARCH-004 | Keep source coordinates separate from character segmentation and display-width measurement.                                               |
| ARCH-005 | Use Effect at execution/error boundaries; keep internal transformation and printing stages pure and deterministic.                        |
| ARCH-006 | A replacement parser must preserve this contract and pass the same fixtures.                                                              |

## Deferred implementation choices

- Concrete internal syntax, attachment, and Doc representations.
- Validated-value constructors, brands, and Schema usage.
- Error classes, exact diagnostic kinds/payloads, and ordering.
- Display-width algorithm, Unicode rules, and supporting library.
- Parser adapter implementation and comment attachment algorithm.
- Fixture loader and contract test harness.

Choose these while implementing the contracts. Keep observable decisions in
[policies.md](policies.md) and concrete expected behavior in the fixtures.
