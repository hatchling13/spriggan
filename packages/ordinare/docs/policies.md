# Ordinare policies

This document records the agreed behavior of the JSON/JSONC beautifier. Policy
IDs are stable references for fixtures. Public API and internal stage contracts
live in [architecture.md](architecture.md). These documents specify behavior and
guarantees while leaving tool and algorithm choices to implementation.

## Scope

Ordinare is an engine independent of the UI, DOM, and file system. Formatting runs
on an explicit user action. Live validation, partial parsing, and editor recovery
are outside the initial scope. Inputs with parser diagnostics produce a failure outcome, including those with
a recovered tree.

## Input and outcomes

| ID        | Policy                                                                                                                                                                   |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| INPUT-001 | The caller explicitly selects JSON or JSONC through the input mode option.                                                                                               |
| INPUT-002 | Parse the entire document and require exactly one root value. Additional roots and unexpected trailing text produce failure. Scalar roots are valid.                     |
| INPUT-003 | Empty input or input containing only permitted whitespace returns the neutral outcome.                                                                                   |
| INPUT-004 | A comments-only document fails the root-value requirement. JSON mode accepts the standard JSON grammar; JSONC additionally accepts comments.                             |
| INPUT-005 | JSON rejects trailing commas. JSONC accepts them. Formatting removes trailing commas as a fixed output policy.                                                           |
| INPUT-006 | Accept one U+FEFF BOM at the very beginning and omit it from output. Preserve U+FEFF inside strings and comments.                                                        |
| INPUT-007 | Accept LF and CRLF line endings. Use the original input unchanged for parsing, diagnostics, and source ranges. BOM handling must preserve original offsets.              |
| ERROR-001 | Invalid input returns the failure outcome. The UI keeps the user's input.                                                                                                |
| ERROR-002 | Normalize parser diagnostics into engine-owned error kinds and original source ranges. Keep external error representations within the adapter boundary.                  |
| ERROR-003 | Invalid input is an expected failure. Implementation bugs and violated internal invariants are distinct from input errors. Empty input follows the neutral success path. |

## Preservation

| ID           | Policy                                                                                                                                                                                           |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| PRESERVE-001 | Preserve the exact spelling of number and string tokens, including large integers, exponent notation, escapes, and negative zero. Obtain their output spelling from original source ranges.      |
| PRESERVE-002 | Preserve object member order and duplicate keys. Represent members as an ordered collection that retains every member.                                                                           |
| PRESERVE-003 | Preserve every comment exactly once, in its original order and with its attachment relationship intact.                                                                                          |
| PRESERVE-004 | Preserve block-comment text, internal spacing, and internal blank lines. Normalize actual line endings to LF and preserve the comment's internal layout.                                         |
| PRESERVE-005 | Preserve string escape sequences such as `\r\n` literally. Apply output line-ending normalization to actual line endings and preserve escape spellings.                                          |
| PRESERVE-006 | Allowed changes are layout whitespace normalization, trailing-comma removal, actual line-ending normalization, and removal of the leading BOM. Preserve all remaining token spellings and order. |

## Layout and options

| ID          | Policy                                                                                                                                                                                                                                      |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LAYOUT-001  | Output indentation choices are two spaces, four spaces, or tabs. Default to two spaces. Normalize syntactically valid input indentation regardless of its original width or mixture.                                                        |
| LAYOUT-002  | Keep tab width as a separate internal option, defaulting to two columns. Use the default in the initial UI and retain the option for later exposure. Advance tabs to the next tab stop when measuring width.                                |
| LAYOUT-003  | Measure line width using display width, independently of source offsets. Default target width is 100 columns. Treat width as a layout target; long string tokens and comments remain intact even when they exceed it.                       |
| LAYOUT-004  | Preserve existing blank lines between content, independently of comment presence. Collapse runs of blank lines to one. Preserve block-comment internal blank lines according to PRESERVE-004.                                               |
| LAYOUT-005  | Remove blank lines immediately after an opening object/array delimiter and immediately before its closing delimiter. Preserve comment-internal blank lines.                                                                                 |
| LAYOUT-006  | Use multiline layout for objects and arrays containing preserved blank lines or line comments. Other wrapping details are established through reference cases.                                                                              |
| LAYOUT-007  | Remove document-leading and document-trailing layout whitespace, then end successful formatted output with exactly one LF. Preserve document-leading/trailing comments and at most one existing blank line between them and the root value. |
| LAYOUT-008  | All actual output line endings are LF as a fixed output policy.                                                                                                                                                                             |
| COMMENT-001 | Preserve leading, same-line trailing, container-internal, and document-level comment relationships. Empty containers may contain comments.                                                                                                  |
| COMMENT-002 | A line comment must be followed by a line break before subsequent syntax. Preserve accompanying comments and their attachments when removing a trailing comma.                                                                              |
| COMMENT-003 | Use Oxfmt behavior as a reference for ambiguous comment placement. Settle concrete placement through input/output fixtures.                                                                                                                 |

## Reference formatter

Oxfmt provides a layout reference for the engine. Use installed
version 0.72.0 with its default options as the initial reference snapshot.
Repository formatting has its own configuration. Review reference changes deliberately;
reference updates enter the contract through explicit review.

When behavior conflicts, use this priority:

1. Preserve source tokens and comment relationships.
2. Apply the explicit policies above, including trailing-comma removal.
3. Consult Oxfmt for remaining layout details.

The compatibility target is Oxfmt layout behavior under the policies above.
Capture intentional differences in policy-linked fixtures.

## Architecture

The public contract, internal invariants, parser isolation, and stage boundaries
are defined in [architecture.md](architecture.md). Existing `ARCH-*` identifiers
are retained there.

## Verification and fixture ownership

| ID         | Invariant                                                                                                                                                                                  |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| VERIFY-001 | Successful output parses under the selected mode.                                                                                                                                          |
| VERIFY-002 | Formatting successful output again with the same mode and options produces exactly the same output.                                                                                        |
| VERIFY-003 | Non-whitespace token spellings and order remain unchanged, except for the changes explicitly permitted by PRESERVE-006. Comments occur exactly once.                                       |
| VERIFY-004 | Error fixtures compare engine-owned error kinds and original source ranges. Base assertions on structured diagnostic data; retain messages and stack traces for explanation and debugging. |

Executable examples live in `tests/fixtures/`; policy IDs connect their payloads
to this document. Fixtures are the single source of truth
for concrete expected outputs. The initial fixtures specify expected behavior. Contract test integration remains
a separate implementation step.

## Remaining reference cases

Concrete wrapping and ambiguous comment placement still need expected-output
fixtures. See the [fixture backlog](../tests/fixtures/README.md#cases-to-settle-or-add).
Implementation choices are listed separately in
[architecture.md](architecture.md#deferred-implementation-choices).
