---
"@ac-kit/format-cbor": patch
"@ac-kit/format-editorconfig": patch
"@ac-kit/format-asn1": patch
"@ac-kit/format-shell": patch
---

Store a parsed key named `__proto__` as an ordinary entry rather than letting it
reach the prototype setter: CBOR map keys in `dataValueToJson`, unrecognised
`.editorconfig` properties, and ASN.1 component names in the BER, CER, DER and
PER decoders. `format-shell` already did this through a local helper, which is
now `@ac-kit/core`'s `setRecordEntry`.
