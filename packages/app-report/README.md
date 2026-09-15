# @ac-kit/app-report

One event pipeline for everything a program reports about itself — log records,
test and benchmark results, the output of a subprocess it is supervising.

Those three normally grow three separate implementations of the same thing: an
event shape, a fan-out, a formatter, a filter. This is the one they share. A
sink written once receives all three, and a program decides at the edge whether
that means coloured lines on a terminal, NDJSON in a file, or both.

```ts
import {
  createFanOutSink,
  MemorySink,
  NoRepeatProxy,
  WritableStreamSink,
} from "@ac-kit/app-report";

// Collapse floods of the same message, then deliver to two destinations.
const sink = new NoRepeatProxy(
  createFanOutSink([new WritableStreamSink(stdout), new MemorySink()]),
  { maxCount: 5, maxDelayMs: 2_000 },
);
```

## What it exposes

- **Contracts** — the `ReportEvent` shape, the `ISink` interface, `Formatter`,
  and the `ATTR_*` well-known attribute keys.
- **Sinks** — `WritableStreamSink`, `NdjsonSink`, `PlainLineSink`,
  `LiveRegionSink`, `AutoTerminalSink`, `MemorySink`, `NullSink`,
  `AggregateSink`, `AsyncQueueSink`, `ExitCodeSink`, `FailureCollectorSink`,
  and `createFanOutSink`.
- **Proxies** — `NoRepeatProxy`, `FilterProxy`, `CoalesceProxy`,
  `RedactionProxy`, `IdleMarkProxy`, `TailWindowProxy`. Each wraps a sink and
  returns a sink, so they compose in any order.
- **Scopes** — `ScopeTracker`, `openScope`, `aggregateScopeStatus`, for nested
  units of work that report progress and a final status.

Portable: no Node.js built-ins. `@ac-kit/app-logger` is the logging front end
built on this, and `@ac-kit/app-system` supplies the host-bound sinks.

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/app-report/)
for the full reference.
