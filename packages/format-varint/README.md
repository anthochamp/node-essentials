# @ac-kit/format-varint

Variable-length integer encodings — the family where an integer is split into
groups of bits and each byte carries a continuation flag, so a value delimits
itself and small values stay small.

```ts
import { encodeVlq, readVlq, vlqDecoder } from "@ac-kit/format-varint";
import { ByteReader } from "@ac-kit/core";

encodeVlq(300); // Uint8Array [0x82, 0x2c]
readVlq(new ByteReader(bytes)); // reads one value, advances the cursor
```

## Which member you want

**VLQ** is base-128, most significant group first, with the continuation bit set
on every byte but the last. It is what ASN.1 X.690 uses for tag numbers (§8.1.2)
and OID arcs (§8.19.2), and what Standard MIDI Files use for delta times.

It is not the only member of the family, and the members are not
interchangeable: LEB128 puts the _least_ significant group first, and source
maps use a base-64 alphabet with the sign in the low bit. Every export here
names its member, so there is no ambiguous `encodeVarint`.

## Reading one value, or reading a stream

Two shapes, because the two situations are genuinely different:

- `readVlq(reader)` reads from a cursor and throws when the bytes run out. Use
  it wherever an enclosing frame already bounds the value — an ASN.1 TLV's
  contents, a file already in memory — because there "out of bytes" means the
  frame lied, not that more is coming.
- `vlqDecoder` is a `Decoder` from `@ac-kit/format-core`. It reports a truncated
  value as `incomplete` so a driver can wait for more input. Use it only where a
  value really can straddle a chunk boundary; it allocates a `DecodeResult` per
  value and is several times slower than the cursor form.

## `number` or `bigint`

`readVlq` and `encodeVlq` work in `number` and cover 0 to
`Number.MAX_SAFE_INTEGER`. `readBigVlq` and `encodeBigVlq` are the unbounded
counterparts.

The encoding itself has no ceiling — X.660 caps no OID arc — so a value too
large for a `number` is well-formed data, not a malformed encoding. `readVlq`
says so: it throws `RangeError` naming `readBigVlq`, and reserves
`VarintMalformedError` for what is actually wrong with the bytes. Prefer the
`number` forms; `bigint` arithmetic is markedly slower and allocates.

## Canonical form

An overlong encoding — a leading `0x80`, whose payload group is zero — is
rejected. X.690 §8.19.2 requires the fewest possible octets, and accepting the
padded form would let two different byte sequences mean the same number.

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/format-varint/)
for the full reference.
