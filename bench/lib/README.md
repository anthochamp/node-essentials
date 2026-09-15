# @ac-bench/lib

The programmatic benchmark API: child-process fork orchestration and protocol,
the environment monitor and cooldown gate, and the escalation decision.

`runBench` is the way in. It takes fully-resolved parameters only — the files to
run, the measure plugins to register, the reporter plugins to report through, a
`MeasurementPlan`, a seed, a signal. No config file, no CLI flags, no profile
name, no string parsing, and no mixed list something downstream has to sort out.

```ts
import { runBench } from "@ac-bench/lib";
import { walkPaths } from "@ac-kit/node";
import durationPlugin from "@ac-bench/measure-duration/plugin";
import tableReporter from "@ac-bench/reporter-table";

await runBench({
  files: await Array.fromAsync(
    walkPaths({ include: "**/*.bench.ts", exclude: "**/node_modules" }),
    (walked) => walked.path,
  ),
  measures: [durationPlugin],
  reporters: [tableReporter],
  output: "bench-results",
  plan: {
    replicates: 2,
    maxReplicates: 5,
    isolatedRuns: 0,
    rounds: 16,
    cooldown: false,
    retryOnInstability: 0,
  },
  orderSeed: 1,
  signal: AbortSignal.timeout(600_000),
});
```

Turning an intent into those parameters — what `--mode rigorous` stands for,
which reporters a config file selected, where output files go — is
`@ac-bench/cli`'s job, not this package's. A caller that wants to run benchmarks
from its own code depends on this package directly and decides those itself.
