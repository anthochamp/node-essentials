# @ac-kit/format-markdown

Renders a `@ac-kit/model-dataset` `DataFrame` as a GFM (GitHub-Flavored
Markdown) pipe table.

A pipe table is the one Markdown construct that is tedious to emit by hand:
column widths have to agree with the alignment row, and any cell containing a
`|` has to be escaped or the row silently gains a column. This takes a frame and
produces a table that renders correctly on GitHub.

```ts
import { renderFrameAsMarkdown } from "@ac-kit/format-markdown";

console.log(renderFrameAsMarkdown(resultsFrame));
// | name    | ops/s  |
// | ------- | ------ |
// | baseline| 12_500 |
```

Portable: no Node.js built-ins, so it runs unchanged in browsers, Deno, Bun and
edge runtimes.

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/format-markdown/)
for the full reference.
