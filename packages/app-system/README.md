# @ac-kit/app-system

The things a long-running program has to do to the machine it runs on, and which
are tedious to get right: claim a PID file without racing another copy of
itself, roll its log files before they fill the disk, ask whether a binary is on
`PATH`, list running processes, and run its shutdown hooks in a defined order.

```typescript
import { ExitManager, hasBinary, ps, writePidFile } from "@ac-kit/app-system";

if (!(await hasBinary("ffmpeg"))) {
  throw new Error("ffmpeg is required");
}

await writePidFile("/run/mytool.pid", process.pid);

const exits = new ExitManager();
exits.registerCleanUpHandler(async () => {
  await flushEverything();
});

const running = await ps({ fields: ["pid", "args"] });
```

`registerCleanUpHandler` takes a priority and returns an unregister function, so
teardown order is declared rather than implied by registration order.

## What it exposes

- **Process lifecycle** — `readPidFile`/`writePidFile`, `processPidFile`,
  `processKillByPidFile`, `processWaitPid`, `ExitManager` with ordered
  priorities, and uncaught-error listeners.
- **Process inspection** — `ps` with filters, `getProcessesSnapshot`,
  `hostMetrics`, and `sysfs` readers.
- **Files** — `rotateLogFiles`, `RotatingFileSink` (optionally gzip-compressed),
  and an artifact cache.
- **Locks** — `FileLock` and `UdpBindLock`, for single-instance enforcement.
- **Terminal and text** — `nodeTerminal`, the Node adapter for
  `@ac-kit/app-terminal`'s `Terminal`, plus charset encode/decode streams.

Node only, by definition: this is the host-bound layer.

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/app-system/)
for the full reference.
