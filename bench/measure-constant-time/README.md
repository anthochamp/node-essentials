# @ac-bench/measure-constant-time

Detects whether an operation's runtime depends on its input — the timing leak
that lets an attacker recover a secret without ever guessing it whole.

This is the dudect approach: run two closures under a randomly interleaved
schedule, crop the distribution tails to discard scheduler noise, and report
Welch's t-statistic. A large statistic means the two inputs are
distinguishable by timing alone.

```ts
import { constantTimeCase, constantTimeCondition } from "@ac-bench/measure-constant-time";

constantTimeCondition("tag comparison", () => {
  constantTimeCase(
    "constantTimeBytesIsEqual",
    () => compare(correctTag, correctTag),
    () => compare(correctTag, wrongFirstByte),
  );
});
```

The two closures are the classes being told apart. A large statistic means an
attacker could distinguish them by timing alone.

A passing result is evidence, not proof: it shows no leak was detected at this
sample size, on this machine, against this compiler's output.

Host-bound for `hrtime.bigint()`'s nanosecond resolution.

Run suites with the `measure` CLI from `@ac-bench/cli`.
