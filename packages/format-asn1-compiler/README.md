# @ac-kit/format-asn1-compiler

Turns ASN.1 module source into schemas you can actually encode with — and back
again.

That is the step between the two other ASN.1 packages: `.asn1` text becomes a
tree (`@ac-kit/format-asn1-notation`), this compiles the tree into type
definitions, and those definitions drive the codecs in `@ac-kit/format-asn1`. It
means a spec's own module text can be the source of truth instead of a
hand-transcribed schema.

```ts
import { compileModules } from "@ac-kit/format-asn1-compiler";
import { cstToAst, parseModule } from "@ac-kit/format-asn1-notation";
import { derDecode } from "@ac-kit/format-asn1/der";

const { cst } = parseModule(moduleSource);
const { defs, errors } = compileModules([cstToAst(cst)]);

const certificate = defs.get("PKIX1Explicit88")?.get("Certificate");
const value = derDecode(certificate, bytes);
```

`decompile` goes the other way, rendering a runtime schema back as module
source. Errors are collected and returned rather than thrown, so one bad
assignment does not discard the rest of the module.

It is a separate package because it is the only piece needing both halves — a
consumer decoding bytes against a hand-written schema, or one only formatting
module source, installs neither the compiler nor the half it does not use.

Portable: no Node.js built-ins, so it runs unchanged in browsers, Deno, Bun and
edge runtimes.
