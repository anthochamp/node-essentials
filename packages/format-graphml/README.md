# @ac-kit/format-graphml

GraphML: parse and serialize graphs, including typed keyed data, hyperedges and
nested graphs.

> **Status: not implemented.** This package holds a scope and a plan only. See
> [`TODO.md`](./TODO.md) for what is planned and in what order.

## Scope

GraphML is the interchange format the academic and Java graph tooling reads —
yEd, JGraphT, NetworkX, igraph. It is the most expressive of the three graph
formats here: it models hyperedges, ports, and graphs nested inside nodes, none
of which DOT or GEXF can express.

That expressiveness is also why it is the last of the three to be worth
building. Most exports need none of it.

## Not in scope

- **Layout and rendering.** Coordinates that appear in a file were computed by
  some other tool; this package preserves them and never produces them.
- **Vendor extensions.** yEd's `y:` namespace and its shape/label vocabulary are
  a separate schema on top of GraphML. Preserved as opaque nodes, not
  interpreted.
- **Graph algorithms and construction.** `@ac-kit/algo` and `@ac-kit/data`.

Portable: no Node.js built-ins, so it runs unchanged in browsers, Deno, Bun and
edge runtimes.
