# @ac-kit/format-ndjson

Newline-delimited JSON — one JSON value per line. It is what log shippers, bulk
APIs and event streams use, because a reader can process each record as it
arrives instead of waiting for a closing bracket.

The question any real NDJSON reader has to answer is what to do with a corrupt
line. Ending the stream loses every good record after it; ignoring the problem
hides data loss. Supplying `onError` reports the bad line and carries on;
omitting it throws.

```ts
import { NdjsonParseStream } from "@ac-kit/format-ndjson";

const events = response.body.pipeThrough(
  new NdjsonParseStream({
    onError: (error) => {
      metrics.malformedLines += 1;
    },
  }),
);

for await (const event of events) {
  handle(event);
}
```

Also exposes `parseNdjson`/`printNdjson`, `NdjsonPrintStream`, and the
line-level `Decoder`/`Encoder` over `@ac-kit/format-core`.

Portable: no Node.js built-ins, so it runs unchanged in browsers, Deno, Bun and
edge runtimes.

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/format-ndjson/)
for the full reference.
