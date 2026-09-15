# @ac-kit/format-ini

INI — `key = value` under `[section]` headers, the format of `.gitconfig`,
`php.ini`, systemd units and countless tools' own settings.

INI has no standard, so the useful thing a parser can do is preserve what it
read. The tree here keeps comment lines, blank lines and key order, which is
what lets you change one setting in someone's config file and hand it back
recognisable.

```ts
import { editIni, parseIni } from "@ac-kit/format-ini";

parseIni("[server]\nport = 8080\n");

// Comments and ordering survive.
editIni(source, ["server", "port"], "9090");
```

Also exposes `printIni`, the order-preserving document tree
(`parseIniDocument`/`printIniDocument`), `createIniEdits`, the
`IniParseStream`/`IniPrintStream` transforms, and a line-oriented
`Decoder`/`Encoder` over `@ac-kit/format-core`.

Portable: no Node.js built-ins, so it runs unchanged in browsers, Deno, Bun and
edge runtimes.

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/format-ini/)
for the full reference.
