# @ac-kit/format-json5

JSON5 — JSON relaxed for humans to write by hand: comments, trailing commas,
unquoted keys, single-quoted strings, hexadecimal numbers and `Infinity`.

It is what a configuration file wants to be when JSON's strictness makes it
hostile to edit.

```ts
import { parseJson5, printJson5 } from "@ac-kit/format-json5";

parseJson5(`{
  // trailing commas and comments are fine here
  port: 8080,
}`);
```

Same surface as the rest of the JSON family: `parseJson5`, `printJson5`,
`editJson5`/`createJson5Edits` for changing one value in place, and
`Json5ParseStream`/`Json5PrintStream` as `TransformStream`s over
`@ac-kit/format-core`.

Portable: no Node.js built-ins, so it runs unchanged in browsers, Deno, Bun and
edge runtimes.

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/format-json5/)
for the full reference.
