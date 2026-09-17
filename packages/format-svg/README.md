# @ac-kit/format-svg

SVG as a document tree, a printer, and an adapter that turns a
`@ac-kit/model-chart` `PlotSpec` into one.

> **Status: not implemented.** This package holds a scope and a plan only. See
> [`TODO.md`](./TODO.md) for what is planned and in what order.

## Scope

Two jobs, and the first is much larger than the second.

**Writing.** Build an SVG document from shapes, text and transforms, then print
it. This needs no XML parser — only correct escaping — which is why it can be
useful long before `@ac-kit/format-xml` exists.

**Rendering a chart.** `@ac-kit/model-chart`'s `PlotSpec` says what is being
communicated and never how it is drawn. This package is one of its adapters:
given a resolved spec, it emits the vector document. The terminal adapter in
`@ac-kit/format-monospace` is the other, and neither knows about the other.

## Not in scope

- **Rasterization.** Turning an SVG into pixels needs a font stack, a path
  rasterizer and a colour-managed compositor. That is a different project.
- **Animation and scripting.** SMIL elements and `<script>` are parsed and
  printed like any other node, but nothing here runs them.
- **Layout of text.** Where a glyph lands depends on the font, which this
  package does not have. Text is positioned by the caller or by the chart
  adapter's declared metrics.

Portable: no Node.js built-ins, so it runs unchanged in browsers, Deno, Bun and
edge runtimes.
