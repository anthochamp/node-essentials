# @ac-bench/util

The fixtures a benchmark needs before it can measure anything honestly.

Two things go wrong most often. Inputs generated with `Math.random()` differ
between runs, so two runs are not comparable; and an "optimised" implementation
that quietly returns the wrong answer wins every benchmark. These helpers
address both: every generator is seeded, and `checksum` gives you a cheap way to
assert two implementations agreed.

```ts
import { checksum, DEFAULT_SEED, randomFloat64Values } from "@ac-bench/util";

// Same values on every run and every machine.
const values = randomFloat64Values(10_000, DEFAULT_SEED);

const expected = checksum(reference(values));
// ... assert each candidate reproduces `expected` before trusting its timing.
```

## What it exposes

- **Seeded workloads** — `randomFloat64Values`, `randomUint32Values`,
  `randomInts`, `words`, `skewedIndices`, `distinctKeys`, and `DEFAULT_SEED`.
- **Equivalence** — `checksum`, `sequentialChecksum`, `hashString`,
  `stringHash32`: order-sensitive digests for proving two implementations
  produced the same output.
- **Contention** — `EventLoopLoad`, a controllable background load, for
  measuring the same operation idle and under pressure.
- **Native toolchains** — `prepareNativeToolchains`, for suites comparing
  against a reference implementation in another language.

Generic process helpers (`execAsync`, `hasBinary`, `createTempDir`) are
`@ac-kit/node`'s — they carry no measurement-specific semantics. Spawn-overhead
calibration lives with the measure that needs it, in
`@ac-bench/measure-duration`.
