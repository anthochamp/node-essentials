# @ac-kit/core

The operations the JavaScript standard library leaves out, with no domain
knowledge of its own — the base every other `@ac-kit` package is built on.

Nothing here invents a concept. Each function is one a program keeps needing and
keeps reimplementing slightly differently: comparing two values deeply, clamping
a number, grouping a `Map`, reading a big-endian integer out of a buffer,
serialising an object that turns out to be cyclic.

```ts
import { ByteReader, defaults, jsonSerializeSafe } from "@ac-kit/core";

// Options merging that keeps an explicit `undefined` from clobbering a default.
const options = defaults(userOptions, { retries: 3, timeoutMs: 1_000 });

// A cursor over bytes, so a parser reads fields instead of tracking offsets.
const reader = new ByteReader(buffer);
const tag = reader.readByte();
const payload = reader.read(4);

// Survives cycles instead of throwing.
jsonSerializeSafe(objectThatReferencesItself);
```

## What it covers

Organised by the JavaScript type it extends: `array/`, `string/`, `number/`,
`big-int/`, `map/`, `set/`, `iterable/`, `object/`, `promise/`, `time/`,
`function/`, plus guards and type helpers, JSON replacers and safe
serialisation, pattern matching, error utilities, and the `ByteReader` /
`ByteBuilder` byte cursor.

Portable: no Node.js built-ins, so it runs unchanged in browsers, Deno, Bun and
edge runtimes. The host-bound counterpart is `@ac-kit/node`.

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/core/)
for the full reference.
