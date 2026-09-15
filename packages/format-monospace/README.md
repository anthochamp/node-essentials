# @ac-kit/format-monospace

Fixed-width text layout: rendering a table into a terminal so its columns line
up, whatever is in the cells.

That is harder than counting characters. An emoji occupies two columns, a CJK
ideograph occupies two, a combining accent occupies none, and an ANSI colour
escape occupies none while inflating `String.length`. Getting any of those wrong
skews every column to its right.

Named for the medium rather than for tables, because the same visible-width-aware
and `colorDepth`-aware layout machinery is what any fixed-width renderer needs.

```ts
import { renderTable, truncateToWidth, visibleWidth } from "@ac-kit/format-monospace";

visibleWidth("日本語"); // 6, not 3 — each ideograph is two columns wide
visibleWidth("\u001b[31mred\u001b[0m"); // 3, the escapes take no space

truncateToWidth("👋 hello", 4); // never splits a grapheme cluster

console.log(renderTable(frame, { border: "none" }));
```

Column sizing is East-Asian-Width-aware and grapheme-cluster-correct, built on
`@ac-kit/algo`'s `isInSortedIntervals` and `@ac-kit/core`'s generic
`truncateCore`. Tables render a `@ac-kit/model-dataset` `DataFrame`.

Also exposes `measureColumnWidths`, `measureTableLayout`, `resolveColumns`,
`padToVisibleWidth`, `graphemeSegments`, `renderTableRow`/`renderRuleLine` for
driving the layout yourself, and `spinnerFrames`/`glyph` for live output.

Portable: no Node.js built-ins, so it runs unchanged in browsers, Deno, Bun and
edge runtimes.

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/format-monospace/)
for the full reference.
