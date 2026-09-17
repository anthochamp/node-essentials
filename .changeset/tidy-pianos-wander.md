---
"@ac-kit/core": minor
---

- **Breaking:** `InetAddress`, `InetEndpoint` and `composeInetAddress` are gone,
  and so are `EPHEMERAL_PORT_MIN_VALUE`, `EPHEMERAL_PORT_MAX_VALUE` and
  `getRandomEphemeralPort`. `core` holds language extensions and wrappers over
  simple Web APIs, and `ARCHITECTURE.md` §3 names IP addressing as the example
  of something pure that is nonetheless domain knowledge. The first three are
  now `@ac-kit/node`'s, where `composeInetAddress` is spelled `toInetAddress`;
  the ephemeral port range is `@ac-kit/net-address`'s, beside the rest of the
  RFC 6335 port semantics. No compatibility re-export is left behind.
- New `flattenRecord(source, options)` and `unflattenRecord(source, options)`,
  collapsing a nested record to delimiter-joined keys and back. A multi-segment
  path can never reach `__proto__`, `constructor` or `prototype`; a
  single-segment key is a leaf and is kept as one, because a record of
  environment variables should still be able to hold one called `constructor`.
  An array is a leaf value by default rather than being numbered, since an index
  is the one segment a flattened key cannot tell apart from an ordinary key
  spelled `"0"`. A key that itself contains the delimiter is not escaped and the
  delimiter wins on the way back, so the round trip holds exactly for keys that
  do not contain one.
- New `bytesMap(bytes, map)` and `bytesCombine(a, b, combine)`, applying a
  function to every octet of one array or to every octet pair of two. Both mask
  the callback's result to a single octet, so `~byte` and `left & right` read as
  the bitwise operations they are rather than trailing an `& 0xff` that is easy
  to forget and silent when it is. `bytesCombine` throws on mismatched lengths
  instead of pairing up to the shorter array: a bitwise operation over two
  different widths has no meaning, and truncating to the shorter one turns that
  into a wrong answer rather than an error.
- New `nextUtf8Boundary(bytes, index)`, the first UTF-8 character boundary at or
  after `index`. Slicing a UTF-8 buffer at an arbitrary offset — a tail, a
  window, a chunk handed to `decodeText` — can land inside a multi-byte
  sequence, whose orphaned tail decodes to a leading U+FFFD; aligning the offset
  forward drops the partial character instead.
- Five more ASCII predicates: `isAsciiControl`, `isAsciiGraphic`,
  `isAsciiPrintable`, `isAsciiPunctuation` and `isAsciiBlank` — C's `iscntrl`,
  `isgraph`, `isprint`, `ispunct` and `isblank`, joining the `isalpha`/`isdigit`
  family already here. Where `punct` stops and `graph` starts is exactly the kind
  of boundary a hand-written range table gets subtly wrong, and every copy of it
  gets it wrong differently.
