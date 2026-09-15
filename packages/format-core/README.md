# @ac-kit/format-core

Codec contracts shared by every data format package, and every way to drive
them.

A format package has up to three faces: a **model** (the value type), a **syntax
face** (Lexer → CST → AST → Printer, for a human-authored surface form), and a
**wire face** (`Decoder`/`Encoder`, for a machine-produced surface form). This
package is the wire face's shared contract, plus the five ways to consume it:

- `decodeAll` — one-shot, whole-input decode of a repeatable-item format. This
  is what a package's `parse*` utility is built on, rather than a second
  implementation of the same grammar.
- `DecodeStream` — a `TransformStream`, for any incremental, non-live source.
- `EncodeStream` — its write-side counterpart, driving an `Encoder` and
  preserving its vectored return.
- `DecodeDriver` — the shared engine behind those, and behind `net-core`'s
  `FrameLink` (live, transport-bound).
- `wholeTextParseTransformer`/`textPrintTransformer` — for grammars with no
  incremental decode capability at all (JSON, YAML, TOML).

A codec is always split into a `Decoder` and an `Encoder`; `Codec` is the
composed pair, which only `FrameLink` needs whole. `createLineCodec` and
`createDelimitedCodec` ship here because line- and delimiter-termination are
generic framing primitives with no spec of their own — a named, published
framing format gets its own package instead, as netstring does.

```ts
import { decodeAll, DecodeStream } from "@ac-kit/format-core";

// One grammar, two ways to drive it: whole-input…
const rows = decodeAll(new MyRowDecoder(), source);

// …and incrementally, over a stream too large to hold.
const decoded = response.body.pipeThrough(new DecodeStream(new MyRowDecoder()));
```

Writing a decoder once and getting both is the point: a package's `parse*`
utility is `decodeAll` over its `Decoder`, never a second implementation of the
same grammar.

## `DecodeBuffer` implementations

`DecodeBuffer<View, Chunk>` has four implementations, at different points on the
same tradeoff — copy on append vs. cost per read:

- `@ac-kit/core`'s `ByteAccumulator` — a contiguous arena. Structurally
  satisfies `DecodeBuffer<Uint8Array>`; it cannot `implements` it directly since
  `core` sits below this package.
- `TextBuffer` — the same shape over `string`, for a decoder whose input is
  already text.
- `TextDecodeBuffer` — byte chunks in, text view out. The `Chunk`/`View` split
  exists for this: a decoder written against `string` (ndjson, csv, ini, ansi)
  can be driven straight from a byte source, with the `TextDecoder` held across
  appends so a split multi-byte sequence is reassembled.
- `ChunkListBuffer` — zero-copy-on-append, backed by `ByteCursor`. Reach for it
  only when a protocol accumulates a large value outside a declared body;
  otherwise `ByteAccumulator` wins, since a decode buffer holds bounded control
  data while payloads stream past it.

Every one takes a mandatory retention ceiling: a decoder that never reaches a
verdict would otherwise let a peer grow it without bound.

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/format-core/)
for the full reference.
