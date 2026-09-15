# @ac-kit/app-logger

Structured logging: every entry is a record with a level, a message and
attributes, not a pre-formatted string. That separation is the point — the same
entry renders as coloured text on a terminal and as NDJSON in a log file,
because formatting is decided at the sink, not at the call site.

```typescript
import { ansiLogFormatter, Logger } from "@ac-kit/app-logger";
import { WritableStreamSink } from "@ac-kit/app-report";
import { nonClosingWritableStream } from "@ac-kit/node";

const sink = new WritableStreamSink(
  nonClosingWritableStream(process.stdout),
  { formatter: ansiLogFormatter },
);
const logger = new Logger(sink, { attributes: { service: "api" } });

logger.info("listening", { attributes: { port: 8080 } });
logger.error("upstream failed", { error: new Error("ECONNREFUSED") });

await using request = logger.scope("handling request");
request.progress(3, 10);
```

`logger.scope()` returns an `AsyncDisposable`: the scope reports success when
the block exits normally and failure when it throws, so no `try`/`catch` is
needed to keep the two in step.

## What it exposes

- `Logger` — `debug`, `info`, `warn`, `error`, `fatal`, the level-taking `log`,
  and `scope` for nested, progress-reporting work.
- `ansiLogFormatter`, `jsonLogFormatter`, `plainLogFormatter` — the three
  renderings.
- `ConsoleSink` — a drop-in `Console` that routes `console.log` and friends
  into the same pipeline.
- `loggerOptionsFromEnv` — explicit opt-in to reading level and colour settings
  from the environment.

Sinks, proxies and fan-out come from `@ac-kit/app-report`, so a logger and a
test reporter can share one destination.

Node only.

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/app-logger/)
for the full reference.
