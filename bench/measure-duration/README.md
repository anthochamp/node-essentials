# @ac-bench/measure-duration

How long an operation takes — measured properly, which means enough samples to
say something, and a warning when the number should not be trusted.

A single timing is noise. This samples adaptively until the distribution
stabilises, then reports the statistics alongside quality warnings: outliers, a
slow first run (JIT warm-up), high variance, harness overhead dominating the
measurement, or simply too few samples.

```ts
import { durationCase, durationCondition } from "@ac-bench/measure-duration";

durationCondition("array sum", () => {
  durationCase("for loop", () => {
    let total = 0;
    for (const value of values) total += value;
  });

  durationCase("reduce", () => {
    values.reduce((total, value) => total + value, 0);
  });
});
```

A _condition_ groups cases that are alternatives to each other; a _case_ is one
implementation. Build the inputs outside the timed closure — anything inside it
is measured too.

Also exposes `measureSpawnOverhead` and `calibrateSpawnOverhead` for cases that
spawn a subprocess per iteration, and re-exports the `beforeAll`/`afterAll`
hooks from `@ac-bench/core`.

Run suites with the `measure` CLI from `@ac-bench/cli`.
