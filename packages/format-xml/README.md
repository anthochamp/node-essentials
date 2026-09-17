# @ac-kit/format-xml

XML 1.0: a syntax tree, a namespace-aware parser, and a printer that round-trips
what it read.

> **Status: not implemented.** This package holds a scope and a plan only. See
> [`TODO.md`](./TODO.md) for what is planned and in what order.

## Scope

XML is the substrate three other formats in this tree are written on top of —
`@ac-kit/format-svg`, `@ac-kit/format-gexf` and `@ac-kit/format-graphml` — and
none of them should carry its own parser. That is the whole reason this package
exists: one XML implementation, three consumers, no third copy of entity
decoding.

The tree preserves what a serializer normally throws away — attribute order,
comments, processing instructions, CDATA sections and whitespace — because
editing a document in place is a first-class use, not an afterthought. A
consumer that only wants values ignores the extra nodes; one that wants to
rewrite a single attribute and hand back a byte-identical file elsewhere cannot
get that back once it is lost.

## Not in scope

- **DTD validation, XSD and RELAX NG.** Reading a `DOCTYPE` and resolving its
  internal entity declarations is parsing; deciding whether a document conforms
  to a schema is a separate job with a separate vocabulary.
- **XPath and XSLT.** Query and transformation languages, each large enough to
  be its own package if anything ever needs one.
- **HTML.** Its parsing rules are error-recovery rules, not XML's; sharing a
  parser between the two produces something that is wrong for both.
- **External entity resolution.** Never, at any point. Fetching a URI named by
  the document under parse is the XXE vulnerability class, and the only safe
  implementation is the one that does not exist.

Portable: no Node.js built-ins, so it runs unchanged in browsers, Deno, Bun and
edge runtimes.
