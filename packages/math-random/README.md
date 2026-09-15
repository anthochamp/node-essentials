# @ac-kit/math-random

Seeded pseudo-random number generators: give one a seed and it produces the same
sequence every time.

That is exactly what `Math.random()` cannot do. A simulation you want to replay,
a test that must fail the same way twice, a procedurally generated level that
looks identical on every machine — all need the sequence to be a function of the
seed.

```ts
import { xorshift32 } from "@ac-kit/math-random";

const random = xorshift32(12345);
random(); // same value on every run, every machine
random();
```

Each generator is a factory taking a seed and returning a `RandomFn` — a
zero-argument function yielding a float in `[0, 1)`, the same contract as
`Math.random`, so it drops into anything accepting an injectable random source,
such as `@ac-kit/algo`'s `shuffle`.

Available: `mulberry32`, `pcg32`, `sfc32`, `splitmix64`, `xorshift32`,
`xoshiro128p`, `xoshiro256p` — differing in state size, period and speed.

**None of these is cryptographically secure.** Their output is predictable from
a few samples by design. For keys, tokens or nonces use `@ac-kit/crypto-random`.

Portable: no Node.js built-ins, so it runs unchanged in browsers, Deno, Bun and
edge runtimes.

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/math-random/)
for the full reference.
