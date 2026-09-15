# @ac-kit/crypto-hash

Cryptographic hash functions: MD5, SHA-1, SHA-2, SHA-3/SHAKE, BLAKE2,
RIPEMD-160, SM3.

A hash reduces any input to a fixed-size fingerprint that is impractical to
reverse or to collide deliberately. That makes it the building block for content
addressing, integrity checks, commitments and — with a key — authentication.

```typescript
import { Sha3_256Sink, sha256Ts } from "@ac-kit/crypto-hash";

const digest = sha256Ts(new TextEncoder().encode("hello"));

// For data that arrives in pieces, a sink is a WritableStream: pipe into it and
// await its digest once the stream closes.
const sink = new Sha3_256Sink();
await sourceStream.pipeTo(sink);
const streamed = await sink.digest;
```

Every algorithm comes in two shapes: a bare name (`sha256`) that prefers the Web
Crypto kernel and returns `Uint8Array | Promise<Uint8Array>`, and a `Ts` suffix
(`sha256Ts`) that is always the TypeScript kernel and always synchronous.
Algorithms with no Web Crypto equivalent — MD5, SHA-224, SHA-3, BLAKE2,
RIPEMD-160, SM3 — offer a single synchronous function. Each also has a `*Sink`
class for hashing a stream.

Each algorithm is verified against published test vectors (NIST CAVP, RFC/GB
worked examples) and, where a matching Web Crypto or `node:crypto` algorithm
exists, differentially tested against it.

MD5 and SHA-1 are included for interoperability with formats that mandate them.
Neither is collision-resistant; do not use them for signatures or integrity
against an adversary.

Portable: no Node.js built-ins, so it runs unchanged in browsers, Deno, Bun and
edge runtimes.

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/crypto-hash/)
for the full reference.
