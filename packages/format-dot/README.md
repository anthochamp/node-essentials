# @ac-kit/format-dot

Graphviz DOT: a syntax tree, a parser, a printer, and conversion to and from
`@ac-kit/data`'s graphs.

> **Status: not implemented.** This package holds a scope and a plan only. See
> [`TODO.md`](./TODO.md) for what is planned and in what order.

## Scope

DOT is the format a graph gets written to when it has to leave the process — for
rendering by Graphviz, for a diagram in a document, for a human to read in a
diff. It is plain text with a small grammar, which makes it the cheapest graph
interchange to support and the most useful one to have first.

The tree keeps attribute order and comments, so a hand-maintained `.dot` file
survives a read-modify-write.

## Not in scope

- **Layout.** DOT files carry attributes that _ask_ for a layout; computing one
  is `@ac-kit/algo`'s `layout/` (`layeredLayout` is what `dot` itself does).
  This package never positions anything.
- **Rendering.** Producing an image is Graphviz's job, or
  `@ac-kit/format-svg`'s.
- **The `xdot` output dialect.** It is a rendering intermediate carrying
  computed coordinates, which is the opposite direction from what this package
  is for.

Portable: no Node.js built-ins, so it runs unchanged in browsers, Deno, Bun and
edge runtimes.
