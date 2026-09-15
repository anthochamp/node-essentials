# @ac-kit/format-editorconfig

Parse `.editorconfig` files, resolve the properties that apply to a path, and
apply them to text.

```ts
import {
  applyEditorConfigStyle,
  parseEditorConfig,
  resolveEditorConfig,
} from "@ac-kit/format-editorconfig";

const properties = resolveEditorConfig(
  [{ directory: "/repo", file: parseEditorConfig(source) }],
  "/repo/src/main.ts",
);

const normalized = applyEditorConfigStyle(text, properties);
```

## Resolution is separate from the file walk

`resolveEditorConfig` takes files that have already been read, ordered outermost
first, and returns the merged properties for one path. Ascending the directory
tree and stopping at `root = true` needs a filesystem, so it lives in
`@ac-kit/app-config` instead — which is what keeps this package portable.

## What `applyEditorConfigStyle` does not do

It applies `end_of_line`, `insert_final_newline` and `trim_trailing_whitespace`.
It deliberately does not re-indent: honouring `indent_style` and `indent_size`
means knowing the language's own nesting, and any text-level rule that tries
corrupts string literals and here-documents. Use `detectEditorConfigStyle` to
report what a file already does, including its indentation.

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/format-editorconfig/)
for the full reference.
