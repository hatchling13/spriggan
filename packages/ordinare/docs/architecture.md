# Ordinare architecture contracts

This document records the agreed public API and internal stage guarantees that
guide engine implementation. Observable formatting rules live in
[policies.md](policies.md); concrete examples live in
[fixtures](../tests/fixtures/README.md).

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

The error names refer to the contracts below. Their constructors and concrete
representations remain implementation choices. These declarations illustrate the
API boundary and use the error contracts described below.

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

`ParseError` contains at least one engine-owned diagnostic. Each diagnostic has an
engine-owned kind and an original source range. `InvalidOptionsError` contains at
least one issue identifying the offending option and violated rule. Exact kind
lists, payload types, and ordering for parse diagnostics remain design decisions.
The option-issue contract is defined below.

### Option error collection and normalization

Collect all available option diagnostics across invalid fields. Normalize
individual diagnostics into engine-owned issues. The current broad
classifications are:

| Issue kind                | Option fields            |
| ------------------------- | ------------------------ |
| `InvalidChoice`           | `mode`, `indentation`    |
| `ExpectedPositiveInteger` | `printWidth`, `tabWidth` |

Interpret each diagnostic path before constructing an issue. The current options
are flat, so an accepted path contains exactly one of the four field names above.
A missing, empty, nested, or unrecognized path follows the mapping invariant
violation path.

Flatten external diagnostic trees into engine-owned issues. The public contract
consists of each resulting diagnostic's field, violated rule, and explanatory
detail; external tree structure stays within the normalization boundary. Each
issue carries its broad classification together with its diagnostic detail. The
exact detail payload and any additional rule distinctions remain to be designed.

Retain individual diagnostics, including those sharing a field or broad issue
kind. Preserve their order and count after flattening. The UI may group diagnostics
in its presentation while retaining the engine result. The engine-owned flat
diagnostics define the preservation scope. The original `SchemaError` may serve
as an optional internal debugging cause.

The resulting list contains at least one issue. An empty list follows the mapping
invariant violation path. Mapping invariant violations enter the defect channel.

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

The diagnostic contract uses engine-owned kinds and original source ranges.
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
- Apply defaults only to omitted options: two-space indentation, width 100, tab
  width 2.
- Route invalid choices and widths to `InvalidOptionsError`, preserving the
  supplied values through validation.
- Widths are finite positive integers.
- Produce a new value and preserve the caller's options unchanged.
- Every resolved option is present and carries its validation guarantees for
  downstream consumers.

The internal shape has required `mode`, `indentation`, `printWidth`, and `tabWidth`
fields. Validated widths have a representation that carries their positive-integer
guarantee; the branding or Schema mechanism is deferred.

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

Initially use Microsoft's `jsonc-parser` behind an adapter. Convert its types,
diagnostics, options, and coordinates at that boundary. Preserve source-token
spellings for output through their original source ranges.

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

- Concrete internal syntax, attachment, and Doc representations.
- Validated-value constructors, brands, and Schema usage.
- Error classes and exact parse-diagnostic kinds/payloads and ordering.
- Option diagnostic detail payloads and any finer rule distinctions. Broad option
  classifications and preservation of individual flattened diagnostics are
  specified above.
- Display-width algorithm, Unicode rules, and supporting library.
- Parser adapter implementation and comment attachment algorithm.
- Fixture loader and contract test harness.

Choose these while implementing the contracts. Keep observable decisions in
[policies.md](policies.md) and concrete expected behavior in the fixtures.
