# @ac-kit/format-cbor

## 0.1.1

### Patch Changes

- a493b4a: Store a parsed key named `__proto__` as an ordinary entry rather than letting it
  reach the prototype setter: CBOR map keys in `dataValueToJson`, unrecognised
  `.editorconfig` properties, and ASN.1 component names in the BER, CER, DER and
  PER decoders. `format-shell` already did this through a local helper, which is
  now `@ac-kit/core`'s `setRecordEntry`.
- Updated dependencies [a493b4a]
- Updated dependencies [a493b4a]
- Updated dependencies [a493b4a]
- Updated dependencies [2ab5593]
- Updated dependencies [a493b4a]
  - @ac-kit/core@0.2.0
  - @ac-kit/algo@0.1.1
  - @ac-kit/format-core@0.1.1
  - @ac-kit/math-numbers@0.1.1
