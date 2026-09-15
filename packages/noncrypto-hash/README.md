# @ac-kit/noncrypto-hash

Non-cryptographic hashes and checksums over bytes — for hash tables, sharding,
cache keys, change detection, error detection over wire protocols/file formats,
and content-defined chunking.

```ts
import { xxhash_32 } from "@ac-kit/noncrypto-hash";

const bucket = xxhash_32(new TextEncoder().encode(key)) % shardCount;
```

## What's included

### Hashes — dispersion-optimized, one-shot `(data) => digest`

- **`xxhash_32`, `xxhash_64`, `xxh3_64`, `xxh3_128`** — `xxh3_*` is Yann
  Collet's newer, faster xxHash successor; the usual default otherwise: very
  fast on long inputs, good dispersion.
- **`murmur3_32`, `murmur3_128_x86`, `murmur3_128_x64`** — widely implemented,
  so the choice when a digest has to match another system. The two 128-bit
  variants produce _different_ digests; they are named for the architecture
  their reference implementation was tuned for, not for where they run.
- **`fnv1a_32`, `fnv1_32`, `fnv1a_64`, `fnv1_64`** — tiny and dependency-free,
  with better dispersion than `djb2a` on short similar inputs.
- **`djb2`, `djb2a`** — the classic 1991 multiply-and-add, and its XOR variant.

Every hash function takes a `Uint8Array` and an optional seed, and returns a
`number` (32-bit), a `bigint` (64-bit) or a `Uint8Array` (128-bit).

### Checksums — error-detection-optimized, one-shot `(data) => digest`

- **`crc_8`, `crc_16`, `crc_32`, `crc_64`** — one generic, table-driven,
  Rocksoft/CRC-RevEng-parametrized engine per register width, with named presets
  (`CRC32_ISO_HDLC`, `CRC32C`, `CRC16_XMODEM`, `CRC8_MAXIM`, …) rather than one
  hand-written function per named variant.
- **`adler_32`** — zlib's two-running-sums-mod-65521 checksum.
- **`inetSum`** — RFC 1071's one's-complement sum of 16-bit words;
  IPv4/TCP/UDP/ICMP headers.
- **`fletcher_16`, `fletcher_32`** — stronger error detection than Adler-32 at
  comparable cost.
- **`xorSum`, `lrc`** — plain XOR and two's-complement longitudinal redundancy
  check; NMEA 0183, Intel HEX, Modbus ASCII.

### Rolling hashes — incremental, stateful, byte-at-a-time `push`

Unlike the rest of this package, these mutate as a window of bytes slides past
and are exposed as classes implementing the shared `IRollingHash<R>` interface
(`push(byteIn)`/`value`) rather than one-shot functions — content-defined
chunking (deduplication, rsync-style diffing) needs the hash of a sliding window
recomputed in O(1) per byte, not O(windowSize).

- **`Buzhash`** — cyclic-polynomial hashing (Cohen, 1997): a substitution table
  plus bit rotation, no multiplication. `R = number`.
- **`RabinFingerprint`** — GF(2) polynomial division (Rabin, 1981) — the same
  math as a non-reflected CRC, plus a sliding window. `R = bigint`.
- **`RabinKarpHash`** — the "standard polynomial" rolling hash: ordinary modular
  integer arithmetic instead of GF(2). `R = bigint`.
- **`GearHash`** — `hash = (hash << 1) + table[byteIn]`; a byte's contribution
  decays out of the tracked width after ~64 pushes instead of being explicitly
  removed, so it has no fixed window (no `windowSize`, unlike the other three).
  Purpose-built for FastCDC-style chunk-boundary detection.

`Buzhash`, `RabinFingerprint` and `RabinKarpHash` each additionally expose their
own `readonly windowSize: number` (construction-time constant, not part of
`IRollingHash` since `GearHash` has no equivalent).

## What's not included

**Anything with a security claim.** These are built for speed and distribution
(hashes) or for catching accidental corruption (checksums), and an adversary can
defeat all of them at will. Never use them for signatures, password storage,
integrity against tampering, or any other place a message digest or a MAC is
load-bearing — reach for the `@ac-kit/crypto-*` packages instead.

Portable: no Node.js built-ins, so it runs unchanged in browsers, Deno, Bun and
edge runtimes. Its only dependency is `@ac-kit/core`.

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/noncrypto-hash/) for
the full reference.
