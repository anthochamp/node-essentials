# @ac-bench/measure-jitter

How punctual a timer actually is — not how punctual it is on average.

A timer that fires early half the time and late the other half has a mean
lateness of zero and is useless for anything that needs a steady tick. So this
reports drift, overruns and tail lateness instead, backed by
`perf_hooks.monitorEventLoopDelay`.

```ts
import { jitterCase, jitterCondition } from "@ac-bench/measure-jitter";

jitterCondition("60fps tick", () => {
  // 16 ms is the period the timer is supposed to hold.
  jitterCase("setInterval", 16, (record) => scheduleWithInterval(record));
  jitterCase("self-correcting setTimeout", 16, (record) =>
    scheduleSelfCorrecting(record),
  );
});
```

Pair it with `@ac-bench/util`'s `EventLoopLoad` to measure the same timer both
idle and under contention — the difference is usually the finding.

Host-bound: it reads Node's event-loop delay monitor.

Run suites with the `measure` CLI from `@ac-bench/cli`.
