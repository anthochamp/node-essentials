# @ac-kit/format-asn1-notation

ASN.1 (X.680) notation: the syntax tree, parser and printer for `.asn1` module
source — the language an RFC uses to define a certificate or a protocol message
before anything is encoded.

No bytes are read or written here. `@ac-kit/format-asn1` is the X.690 runtime
that encodes and decodes them, and `@ac-kit/format-asn1-compiler` turns the trees
this package produces into schemas that runtime can execute.

```ts
import { parseModule, printCst } from "@ac-kit/format-asn1-notation";

const { cst, errors } = parseModule(`
PKIX1Explicit88 DEFINITIONS ::= BEGIN
  Version ::= INTEGER { v1(0), v2(1), v3(2) }
END
`);

printCst(cst); // round-trips the source, comments and layout included
```

Parsing keeps a concrete syntax tree — comments and layout included — so a
printer can round-trip a module, and `cstToAst` lowers it to the abstract tree a
compiler wants (`printModule` renders that one). `errors` is returned rather
than thrown, so a malformed module still yields a usable partial tree for an
editor to work with.

Portable: no Node.js built-ins, so it runs unchanged in browsers, Deno, Bun and
edge runtimes.

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/format-asn1-notation/)
for the full reference.
