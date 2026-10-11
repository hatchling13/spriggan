# Behavior fixtures

Fixtures describe agreed behavior before the engine is implemented. They are not
yet connected to Vitest. Policies live in [policies.md](../../docs/policies.md).

Each case directory contains:

- `case.json`: case ID, policy IDs, input mode, optional output options, and outcome.
- `input.txt`: exact source text, including intentionally invalid syntax, BOMs,
  CRLFs, or surrounding whitespace.
- `expected.txt`: exact formatted output for successful cases only.

Payloads use `.txt` so repository JSON formatters do not normalize the very text
being tested. Preserve the files byte-for-byte. A future loader should read them
as UTF-8 without trimming or discarding a leading BOM. Successful outputs end in
one LF. Missing output options mean engine defaults, not repository Oxfmt options.

Outcomes are `formatted`, `neutral`, or `failure`. These metadata values describe
fixture behavior; they do not prescribe the public API's type names. Failure cases
currently record the expected failure outcome only. Add exact engine-owned error
kinds and ranges after the diagnostic contract is designed; do not derive them
from an external parser's message text.

## Initial cases

| Case                    | Coverage                                                                      |
| ----------------------- | ----------------------------------------------------------------------------- |
| `layout-normalization`  | Mixed indentation, repeated blank lines, comments, and trailing-comma removal |
| `duplicate-keys`        | Original member order and duplicate keys                                      |
| `large-number`          | Scalar root and number spelling beyond JavaScript's safe integer range        |
| `string-escapes`        | Original escape spelling                                                      |
| `trailing-line-comment` | Removing a trailing comma while preserving a same-line comment                |
| `crlf-input`            | CRLF input becomes LF output                                                  |
| `leading-bom`           | Leading BOM acceptance and removal                                            |
| `whitespace-only`       | Neutral outcome without output                                                |
| `comments-only`         | Failure because no root value exists                                          |
| `json-trailing-comma`   | JSON mode rejects a trailing comma accepted in JSONC                          |

## Cases to settle or add

- Four-space and tab output, including tab-stop width measurement.
- Nested containers and line-width boundaries with ASCII, CJK, and emoji.
- One-line containers with block comments and multiline comments.
- Blank lines immediately inside delimiters and around document-level comments.
- Comments between a value and comma, after commas, and inside empty containers.
- Block-comment spacing and blank lines, with CRLF normalization.
- Negative zero, exponent spellings, and additional string escapes.
- Empty input, multiple root values, incomplete syntax, and unexpected trailing text.
- The same input in JSON and JSONC modes, and U+FEFF inside strings/comments.
- Exact diagnostic kinds and ranges once the error contract is designed.

For each successful case, the future harness should also check reparsing,
idempotence, and preservation. Run the same contract cases against any replacement
parser adapter.
