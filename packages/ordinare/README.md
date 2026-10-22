# ordinare

JSON and JSONC beautifier engine for Spriggan. The package currently implements
options parsing, default resolution, branded positive-integer widths, and
structured option diagnostics. Source parsing and formatting are upcoming stages.

The engine is intended to work independently of the web UI. Internal consumers
use the `@spriggan/source` export condition; external consumers use the built
JavaScript and declarations in `dist`.

The current package entry point exports the `BeautifyOptions` type. Options
parsing and error normalization remain internal while the engine is developed.

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

Fallback diagnostics and mapping-defect tests are upcoming verification work.
Source-formatting fixtures are recorded in `tests/fixtures/`; integration with a
test runner follows implementation of the formatting pipeline.
