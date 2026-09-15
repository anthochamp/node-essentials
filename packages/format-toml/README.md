# @ac-kit/format-toml

TOML — the configuration format designed so a human can read the file and a
machine can parse it unambiguously. Sections are `[headers]`, values are typed,
and dates are a first-class type rather than a string convention.

```ts
import { editToml, parseToml, printToml } from "@ac-kit/format-toml";

const config = parseToml(`
[server]
port = 8080
started = 2026-01-01T00:00:00Z
`);

// Change one value; the rest of the document, comments included, is untouched.
editToml(source, ["server", "port"], 9090);
```

Also exposes `printToml`, `createTomlEdits`, and
`TomlParseStream`/`TomlPrintStream` as `TransformStream`s over
`@ac-kit/format-core`.

Portable: no Node.js built-ins, so it runs unchanged in browsers, Deno, Bun and
edge runtimes.

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/format-toml/)
for the full reference.
