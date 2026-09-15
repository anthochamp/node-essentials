# @ac-kit/format-asn1

ASN.1 (X.690) runtime: encoding primitives, the schema model, and the
BER/CER/DER/PER codecs, exposed as subpath exports (`./ber`, `./cer`, `./der`,
`./per`) so a DER-only consumer doesn't pay for the other three.

ASN.1 is three separate jobs, and this package is only the first: turning values
into bytes and back. Reading `.asn1` module source is
`@ac-kit/format-asn1-notation`; turning that source into schemas this package
can run is `@ac-kit/format-asn1-compiler`. Most consumers decode bytes against a
schema they already have and need this package alone.

```ts
import { integer, sequence, utf8String } from "@ac-kit/format-asn1";
import { derDecode, derEncode } from "@ac-kit/format-asn1/der";

const Person = sequence({
  name: utf8String(),
  age: integer(),
});

const bytes = derEncode(Person, { name: "Alice", age: 40 });
const value = derDecode(Person, bytes);
```

Import the codec you need from its own subpath — `./ber`, `./cer`, `./der` or
`./per` — so a DER-only consumer does not carry the other three. DER is the
canonical encoding certificates and signatures use; BER is its permissive
superset; CER is the streaming-friendly canonical form; PER is the compact,
schema-driven encoding used in telecoms protocols.

Portable: no Node.js built-ins, so it runs unchanged in browsers, Deno, Bun and
edge runtimes.
