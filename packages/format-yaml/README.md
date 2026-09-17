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
- `addYamlTagDirective` — inject a `%TAG` handle into source text, once per
  document, leaving existing directives and boundaries alone.
- `resolveYamlAsyncTags` — settle the promises an async custom tag leaves in the
  node tree.
- `YamlParseError` — malformed input, carrying every diagnostic with its line
  and column.
- The `yaml` node and tag model under `Yaml`-prefixed names — `YamlScalarTag`,
  `YamlCollectionTag`, `YamlNode`, `YamlDocument`, `YamlScalar`, the
  `isYaml…` guards, `visitYaml` / `visitYamlAsync`, `yamlToJs` — so a custom tag
  needs no direct dependency on `yaml`.
- `YamlParseStream`, `YamlPrintStream`, and the document-oriented stream
  variants — `TransformStream`s over `@ac-kit/format-core`.

## Custom tags

A tag resolves a value of its own; declaring `resolve` `async` leaves a
`Promise` sitting in the node tree, which `toJS()` would serialise as-is.
`resolveYamlAsyncTags` awaits the tree once, between composing it and reading
it:

```ts
import {
  parseYamlDocument,
  resolveYamlAsyncTags,
  type YamlScalarTag,
} from "@ac-kit/format-yaml";

const includeTag: YamlScalarTag = {
  tag: "!include",
  resolve: async (path) => await readConfig(path),
};

const document = parseYamlDocument(source, { customTags: [includeTag] });
await resolveYamlAsyncTags(document);
document.toJS();
```

A tag handle has to be declared by a `%TAG` directive before the document that
uses it, so it cannot be added once to a multi-document file.
`addYamlTagDirective` patches each document that lacks the handle, inserting the
`---` and `...` markers the grammar then requires:

```ts
addYamlTagDirective(source, "!inv!", "tag:example.com,2024:");
```

## Alias bounds

`parseYaml` caps alias expansion at `DEFAULT_YAML_MAX_ALIAS_COUNT` (100). An
anchor referenced from inside another anchor expands multiplicatively — the
"billion laughs" denial of service — and this bound is what keeps untrusted YAML
from allocating without limit. Pass your own `maxAliasCount` to raise it, lower
it, or disable the check with `-1`.

The bound applies when a document is converted to a plain value, so
`parseYamlDocument` and `parseAllYamlDocuments` do not enforce it: they hand
back nodes. Pass `maxAliasCount` to the document's own `toJS()` there.

Portable: no Node.js built-ins, so it runs unchanged in browsers, Deno, Bun and
edge runtimes.

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/format-yaml/)
for the full reference.
