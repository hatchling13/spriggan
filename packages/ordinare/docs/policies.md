# Ordinare policies

This document records the agreed behavior of the JSON/JSONC beautifier. Policy
IDs are stable references for fixtures. Implementation details listed as deferred
are not additional requirements or settled tool choices.

## Scope

Ordinare is an engine independent of the UI, DOM, and file system. Formatting runs
on an explicit user action. Live validation, partial parsing, and editor recovery
are outside the initial scope. A recovered parser tree must not turn invalid input
into successful output.

## Input and outcomes

| ID        | Policy                                                                                                                                                                                    |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| INPUT-001 | The caller explicitly selects JSON or JSONC. Do not infer the mode from the text.                                                                                                         |
| INPUT-002 | Validate the entire document and require exactly one root value. Reject additional roots and unexpected trailing text. Scalar roots are valid.                                            |
| INPUT-003 | Empty input or input containing only permitted whitespace has a neutral outcome and produces no output.                                                                                   |
| INPUT-004 | A comments-only document has no root value and fails. Comments are invalid in JSON mode.                                                                                                  |
| INPUT-005 | JSON rejects trailing commas. JSONC accepts them, but formatting always removes them. There is no trailing-comma output option.                                                           |
| INPUT-006 | Accept one U+FEFF BOM at the very beginning and omit it from output. This exception does not remove U+FEFF inside strings or comments.                                                    |
| INPUT-007 | Accept LF and CRLF line endings. Preserve the original input for parsing, diagnostics, and source ranges; do not trim or normalize it first. BOM handling must preserve original offsets. |
| ERROR-001 | Invalid input produces failure and no formatted output. The UI keeps the user's input.                                                                                                    |
| ERROR-002 | Normalize parser diagnostics into engine-owned error kinds and original source ranges. External error codes and messages are not the public contract.                                     |
| ERROR-003 | Invalid input is an expected failure. Implementation bugs and violated internal invariants are distinct from input errors. Empty input is a neutral success, not a parse failure.         |

## Preservation

| ID           | Policy                                                                                                                                                                                    |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PRESERVE-001 | Preserve the exact spelling of number and string tokens, including large integers, exponent notation, escapes, and negative zero. Do not reconstruct them from decoded JavaScript values. |
| PRESERVE-002 | Preserve object member order and duplicate keys. Represent members as an ordered collection rather than a keyed record that loses duplicates.                                             |
| PRESERVE-003 | Preserve every comment exactly once, in its original order and with its attachment relationship intact.                                                                                   |
| PRESERVE-004 | Preserve block-comment text, internal spacing, and internal blank lines. Normalize actual line endings to LF; do not reflow or reindent the comment's internal text.                      |
| PRESERVE-005 | Preserve string escape sequences such as `\r\n` literally. Output line-ending normalization applies to actual line endings, not escape spellings.                                         |
| PRESERVE-006 | Allowed changes are layout whitespace normalization, trailing-comma removal, actual line-ending normalization, and removal of the leading BOM. Other token changes are prohibited.        |

## Layout and options

| ID          | Policy                                                                                                                                                                                                                                      |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LAYOUT-001  | Output indentation choices are two spaces, four spaces, or tabs. Default to two spaces. Normalize syntactically valid input indentation regardless of its original width or mixture.                                                        |
| LAYOUT-002  | Keep tab width as a separate internal option, defaulting to two columns. Do not expose it in the initial UI; allow later configuration. Advance tabs to the next tab stop when measuring width.                                             |
| LAYOUT-003  | Measure line width using display width, independently of source offsets. Default target width is 100 columns. The target is not a hard limit: do not split long string tokens or comments to satisfy it.                                    |
| LAYOUT-004  | Preserve existing blank lines between content, with or without comments. Collapse runs of blank lines to one. This rule does not apply inside block comments.                                                                               |
| LAYOUT-005  | Remove blank lines immediately after an opening object/array delimiter and immediately before its closing delimiter. Do not remove blank lines inside a comment.                                                                            |
| LAYOUT-006  | Do not collapse an object or array onto one line if doing so would discard a preserved blank line or a line comment. Other wrapping details are established through reference cases.                                                        |
| LAYOUT-007  | Remove document-leading and document-trailing layout whitespace, then end successful formatted output with exactly one LF. Preserve document-leading/trailing comments and at most one existing blank line between them and the root value. |
| LAYOUT-008  | All actual output line endings are LF. There is no line-ending option.                                                                                                                                                                      |
| COMMENT-001 | Preserve leading, same-line trailing, container-internal, and document-level comment relationships. A container with no values may still contain comments.                                                                                  |
| COMMENT-002 | A line comment must be followed by a line break before subsequent syntax. Removing a trailing comma must not remove or detach its accompanying comment.                                                                                     |
| COMMENT-003 | Use Oxfmt behavior as a reference for ambiguous comment placement. Settle concrete placement with fixtures rather than exposing Oxfmt's internal attachment algorithm.                                                                      |

## Reference formatter

Oxfmt is a layout reference, not the parser or formatting engine. Use installed
version 0.72.0 as the initial reference snapshot, with default options rather than
the repository's formatting configuration. Review reference changes deliberately;
an Oxfmt upgrade does not silently change this contract.

When behavior conflicts, use this priority:

1. Preserve source tokens and comment relationships.
2. Apply the explicit policies above, including trailing-comma removal.
3. Consult Oxfmt for layout details that have not been specified.

The goal is not byte-for-byte compatibility with all Oxfmt output. Capture any
intentional differences in policy-linked fixtures.

## Architecture contracts

```text
Original JavaScript string
  -> parser adapter
  -> engine-owned syntax model
  -> comment attachment
  -> Doc construction
  -> printer
  -> formatted output
```

| ID       | Contract                                                                                                                                                                                    |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ARCH-001 | Initially use Microsoft's `jsonc-parser`, isolated behind an adapter. Its node types, error codes, callbacks, recovery state, and default options do not escape the adapter.                |
| ARCH-002 | The engine-owned model retains the original source, tree structure, token and comment ranges, punctuation information, and relevant whitespace/blank-line information.                      |
| ARCH-003 | Source ranges use UTF-16 code units, with an inclusive start and exclusive end. Convert other parser offset conventions in the adapter. Include any leading BOM in original-source offsets. |
| ARCH-004 | Source positions and display-width measurement are separate concerns. A segmenter's character boundaries do not redefine the source-range contract.                                         |
| ARCH-005 | Use Effect at the execution and error-handling boundary. Keep syntax conversion, comment processing, Doc construction, and printing pure and deterministic.                                 |
| ARCH-006 | Parser replacement must preserve the public behavior and pass the same contract fixtures. A replacement must provide enough source information to satisfy preservation requirements.        |

## Verification and fixture ownership

| ID         | Invariant                                                                                                                                            |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| VERIFY-001 | Successful output parses under the selected mode.                                                                                                    |
| VERIFY-002 | Formatting successful output again with the same mode and options produces exactly the same output.                                                  |
| VERIFY-003 | Non-whitespace token spellings and order remain unchanged, except for the changes explicitly permitted by PRESERVE-006. Comments occur exactly once. |
| VERIFY-004 | Error fixtures compare engine-owned error kinds and original source ranges. Do not compare parser-specific messages or stack traces.                 |

Executable examples live in `tests/fixtures/`; this document links to their policy
IDs rather than duplicating their payloads. Fixtures are the single source of truth
for concrete expected outputs. The initial fixtures are behavior specifications,
not evidence that the unimplemented engine passes them.

## Deferred implementation choices

- Display-width algorithm, Unicode rules, and supporting library.
- Concrete syntax model, parser interface, and Doc representation.
- Effect error classes, exact diagnostic taxonomy, and diagnostic ordering.
- Fixture loader and contract test harness.
- Remaining one-line/multiline, comment-placement, and delimiter boundary cases.

Choose these during implementation or by reviewing specific fixtures. Do not
introduce additional product options solely to accommodate implementation details.
