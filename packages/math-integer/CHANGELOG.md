# @ac-kit/math-integer

## 0.2.0

### Minor Changes

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

### Patch Changes

- Updated dependencies [a5c4d66]
- Updated dependencies [a5c4d66]
  - @ac-kit/core@0.3.0
  - @ac-kit/math-algebra@0.1.2

## 0.1.1

### Patch Changes

- Updated dependencies [a493b4a]
- Updated dependencies [a493b4a]
- Updated dependencies [a493b4a]
- Updated dependencies [2ab5593]
- Updated dependencies [a493b4a]
  - @ac-kit/core@0.2.0
  - @ac-kit/math-algebra@0.1.1
