# @ac-kit/node

The `node:*` built-ins, wrapped so they behave like the rest of your code:
promises instead of callbacks, `AbortSignal` instead of bespoke cancellation,
and typed errors instead of a string `code` on a bare `Error`.

Zero runtime dependencies — every wrapper is over something Node already ships.

```ts
import { existsAsync, walkPaths, writeFileAtomic } from "@ac-kit/node";

for await (const entry of walkPaths({
  include: "**/*.ts",
  exclude: "**/node_modules",
})) {
  console.log(entry.path);
}

// Writes to a temporary file and renames, so a reader never sees a partial file.
await writeFileAtomic("config.json", JSON.stringify(config));
```

## What it covers

- **Sockets** — promise-based TCP, TLS, IPC and UDP classes, addressed with
  `InetAddress` / `InetEndpoint` and `toInetAddress`, which normalizes the
  inconsistent `family` field Node reports.
- **Servers** — promise-based TCP, TLS and IPC listeners, dispatching typed
  connection events.
- **Filesystem** — `walkPaths`, `writeFileAtomic`, `existsAsync`,
  `isDirectoryAsync`, `fileContentEqual`, `compressFile`, `createTempDir`,
  `escapePath`, and `isPathWithin` / `assertPathWithinAsync` for proving a path
  stays inside a root directory, symbolic links included.
- **Processes** — `execAsync`, forking, and typed `NodeError` /
  `NodeSystemError` / `NodeExecError` / `ProcessExitError`.
- **Modules** — `importModule`, `optionalImport`, `resolveModule`.
- **Streams** — including `nonClosingWritableStream`, for wrapping a stream
  whose lifecycle you do not own.

Host-bound by definition. The portable counterpart is `@ac-kit/core`.

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/node/)
for the full reference.
