# @ac-bench/measure-resource

What an operation costs in bytes and CPU time, rather than in wall time.

Wall time alone cannot tell you why something is fast. An implementation that
wins by allocating freely looks identical to one that wins by doing less work —
until the garbage collector runs under load. This reports CPU time, peak heap,
bytes allocated, and garbage-collection count and pause time, so the two are
distinguishable.

```ts
import { resourceCase, resourceCondition } from "@ac-bench/measure-resource";

resourceCondition("parse 10k records", () => {
  resourceCase("streaming", () => parseStreaming(input));
  resourceCase("buffer whole document", () => parseBuffered(input));
});
```

Results are reported in their own units alongside a duration measure, never
converted into one.

Host-bound: it reads Node's resource-usage and GC instrumentation.

Run suites with the `measure` CLI from `@ac-bench/cli`.
