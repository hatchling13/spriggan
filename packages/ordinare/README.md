# ordinare

JSON and JSONC beautifier engine for Spriggan. The package currently implements
options parsing, default resolution, branded positive-integer widths, structured
option diagnostics, and JSON/JSONC source parsing. Parsed documents retain the
original source, a recursive node tree, and ordered tokens with UTF-16 source
ranges. Comment attachment, Doc construction, and printing are upcoming stages.

The engine is intended to work independently of the web UI. Internal consumers
use the `@spriggan/source` export condition; external consumers use the built
JavaScript and declarations in `dist`.

The current package entry point exports the `BeautifyOptions` type. Options
parsing, error normalization, and source parsing remain internal while the engine
is developed.

## Design

- [Behavior policies](docs/policies.md)
- [Public API and architecture contracts](docs/architecture.md)
- [Behavior fixtures and remaining cases](tests/fixtures/README.md)

## Building

Run `pnpm nx build @spriggan/ordinare` from the workspace root.

## Running unit tests

Run `pnpm nx test @spriggan/ordinare` from the workspace root.

Current tests cover default resolution, invalid choices, numeric rule violations,
type mismatches, and preservation of multiple diagnostics across fields and within
a single field. They compare structured diagnostics, including their order and
count.

Parser tests cover scanner-code mapping, leading BOM handling, original node and
token coordinates, U+FEFF preservation in strings and comments, BOM-only neutral
input, and rejection of repeated or misplaced BOMs.

Upcoming verification work includes option fallback diagnostics and mapping
defects, plus broader parsing contracts for mode differences, duplicate keys,
number and escape spellings, empty input, syntax errors, and CRLF ranges.
Source-formatting fixtures are recorded in `tests/fixtures/`; integration with a
test runner follows implementation of the formatting pipeline.
