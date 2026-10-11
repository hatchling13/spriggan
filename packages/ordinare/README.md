# ordinare

JSON and JSONC beautifier engine for Spriggan. The package currently contains the
generated scaffold; the beautifier implementation is pending.

The engine is intended to work independently of the web UI. Internal consumers
use the `@spriggan/source` export condition; external consumers use the built
JavaScript and declarations in `dist`.

## Design

- [Policies and architecture contracts](docs/policies.md)
- [Behavior fixtures and remaining cases](tests/fixtures/README.md)

## Building

Run `pnpm nx build @spriggan/ordinare` from the workspace root.

## Running unit tests

Run `pnpm nx test @spriggan/ordinare` from the workspace root.

The current test covers the scaffold only. The behavior fixtures are not yet wired
to a test runner.
