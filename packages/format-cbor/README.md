# @ac-kit/format-cbor

A CBOR (RFC 8949) codec: a binary encoder/decoder (including an incremental
decoder for streams), a diagnostic-notation lexer/parser/printer (RFC 8949 §8,
extended with comments from RFC 8610 Appendix G, "EDN"), and a JSON bridge (RFC
8949 §6). One value model — {@link DataValue} — is shared by all three, the
second real example (alongside `@ac-kit/format-asn1*`) of a single schema/AST
feeding multiple independent wire formats.

```ts
import {
  decodeCbor,
  encodeCbor,
  parseCborNotation,
  printDataValue,
  diagToValue,
  dataValueToJson,
} from "@ac-kit/format-cbor";

const value = parseCborNotation('{"a": 1, "b": [2, 3]}');
const bytes = encodeCbor(diagToValue(value)); // -> binary CBOR
decodeCbor(bytes); // -> back to a DataValue
printDataValue(decodeCbor(bytes)); // -> '{"a": 1, "b": [2, 3]}'
dataValueToJson(decodeCbor(bytes)); // -> a plain JSON value
```

## Why no separate CST

Unlike `@ac-kit/format-asn1-notation`, this package has no CST/AST split.
ASN.1's notation has real syntactic redundancy (tag class keywords,
parenthesization, `IMPLICIT`/`EXPLICIT`) that a CST preserves and an AST elides;
CBOR diagnostic notation doesn't — it's already close to a literal rendering of
the value tree. `DiagNode` (in `notation/diag-node.ts`) is that value tree with
`span` and EDN comments attached directly, and `diagToValue()` is the one
lowering step to a plain `DataValue`. See `notation/diag-node.ts` for the
reasoning in full.

## Incremental decoding

`decodeCborItem` models the "Lexer as a streaming incremental decoder" shape
directly on `@ac-kit/format-core`'s `DecodeResult` (`incomplete`/`decoded`/
`fatal`) rather than eagerly tokenizing a fully-buffered string, the way
`@ac-kit/format-cron` and `@ac-kit/format-regex`'s lexers do — CBOR items are
self-delimiting but their total length isn't known until fully parsed, which is
exactly the case that needs this shape. `CborItemDecoder` adapts it to
`@ac-kit/format-core`'s `Decoder` contract; drive it with `decodeAll` for a
complete buffer (a CBOR sequence already fully in memory) or `DecodeStream` for
one arriving in chunks over time.

## Scope

Implemented: all 8 major types, definite- and indefinite-length decoding,
half/single/double-precision float decoding, tags (generic — no semantic
interpretation of specific tag numbers), simple values, the diagnostic
notation's base grammar plus EDN comments.

Not implemented (deliberately, not silently): indefinite-length _encoding_ (the
encoder always produces definite-length output — still valid CBOR), bignum
promotion for integers outside `-2^64..2^64-1` (throws instead),
deterministic/canonical encoding (RFC 8949 §4.2), semantic tag interpretation
(dates, bignums, encoding hints — tags decode as generic `{tag, value}` pairs),
and most EDN extensions beyond comments (hex/octal/binary numbers, concatenated
strings, embedded-CBOR `<<...>>`, unprefixed text-as-bytes, base32/base32hex
byte strings).

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/format-cbor/)
for the full reference.
