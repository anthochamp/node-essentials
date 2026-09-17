# @ac-kit/format-gexf

GEXF (Graph Exchange XML Format): parse and serialize graphs, including node and
edge attributes, dynamics and visual hints.

> **Status: not implemented.** This package holds a scope and a plan only. See
> [`TODO.md`](./TODO.md) for what is planned and in what order.

## Scope

GEXF is the interchange format Gephi reads and writes, and the one a graph is
exported to when it carries typed attributes rather than just topology. That is
what separates it from `@ac-kit/format-dot`: DOT attributes are untyped strings,
GEXF declares an attribute schema up front, so a numeric weight survives the
round trip as a number.

It also models time — nodes and edges may appear and disappear over a timeline —
which no other graph format here supports.

## Not in scope

- **Layout and rendering.** GEXF's `viz` namespace carries positions and colours
  that some producer computed; this package reads and writes them but never
  computes them. Layout is `@ac-kit/algo`'s `layout/`.
- **Graph algorithms.** `@ac-kit/algo`.
- **Graph construction and mutation.** `@ac-kit/data`.

Portable: no Node.js built-ins, so it runs unchanged in browsers, Deno, Bun and
edge runtimes.
