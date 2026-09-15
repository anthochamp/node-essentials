# @ac-kit/format-jsonc

JSON with Comments — JSON plus `//` and `/* */` comments and trailing commas,
the dialect `tsconfig.json` and VS Code settings files are written in.

The reason it is its own package is fidelity: editing a value in a JSONC
document must not delete the comments around it. `editJsonc` rewrites only the
span that changed.

```ts
import { editJsonc, parseJsonc } from "@ac-kit/format-jsonc";

parseJsonc(`{
  // which port to listen on
  "port": 8080,
}`);

// The comment above "port" survives.
editJsonc(source, ["port"], 9090);
```

Also exposes `printJsonc`, `createJsoncEdits`, and
`JsoncParseStream`/`JsoncPrintStream` over `@ac-kit/format-core`.

Portable: no Node.js built-ins, so it runs unchanged in browsers, Deno, Bun and
edge runtimes.

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/format-jsonc/)
for the full reference.
