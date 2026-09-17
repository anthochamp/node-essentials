# @ac-kit/format-asn1

## 0.1.2

### Patch Changes

- a5c4d66: **Breaking:** `bigIntToBytesBe` and `bigIntFromBytesBe` move from
  `@ac-kit/math-integer` to `@ac-kit/core`. Update the import specifier; the
  behaviour is unchanged.
  
  They are a wire encoding rather than arithmetic — X.690 §8.3 for an ASN.1
  INTEGER, and what `BigInteger.toByteArray` and `int.to_bytes` produce — and
  their callers need no integer theory at all, while `math-integer` sits too high
  in the dependency graph for some of them to reach it.
  
  New in `@ac-kit/core`: `bigIntToBytesLe` and `bigIntFromBytesLe`, the same
  two's-complement, minimal-or-fixed-width encoding with the least significant
  byte first.
  
  `@ac-kit/format-asn1` no longer depends on `@ac-kit/math-integer`.
- Updated dependencies [a5c4d66]
- Updated dependencies [a5c4d66]
  - @ac-kit/core@0.3.0
  - @ac-kit/format-core@0.1.2
  - @ac-kit/format-varint@0.1.2

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
  - @ac-kit/format-core@0.1.1
  - @ac-kit/format-varint@0.1.1
  - @ac-kit/math-integer@0.1.1
