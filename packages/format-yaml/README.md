# @ac-kit/format-yaml

YAML — including the part most parsers gloss over: a single file may hold
several documents, separated by `---`, and a Kubernetes manifest or a CI config
usually does.

```ts
import { parseAllYamlDocuments, parseYaml, printYaml } from "@ac-kit/format-yaml";

parseYaml("port: 8080");

// A multi-document file, as one value per document.
for (const document of parseAllYamlDocuments(manifestSource)) {
  deploy(document);
}
```

## What it exposes

- `parseYaml` / `printYaml` — a single document.
- `parseYamlDocument` / `printYamlDocument` — the document node, when you need
  its metadata rather than only its value.
- `parseAllYamlDocuments` — every document in a multi-document stream.
- `editYaml` / `createYamlEdits` — change one value, leaving the rest of the
  source as it was.
- `YamlParseStream`, `YamlPrintStream`, and the document-oriented stream
  variants — `TransformStream`s over `@ac-kit/format-core`.

Portable: no Node.js built-ins, so it runs unchanged in browsers, Deno, Bun and
edge runtimes.

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/format-yaml/)
for the full reference.
