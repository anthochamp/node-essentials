# @ac-kit/math-numbers

## 0.2.0

### Minor Changes

- a5c4d66: New `fixed-int-big/`: `bigint`-backed fixed-width integer arithmetic.
  
  `fixedSIntBig*` and `fixedUIntBig*` are the signed and unsigned surfaces — range
  queries, the `*From` overflow gates, arithmetic, shifts, and the two
  reinterpretations between a value and its bit pattern.
  
  Every operation takes `(value, bitWidth, mode?)`, or `(left, right, bitWidth,
  mode?)` when binary. The width is mandatory because the same `bigint` is a
  different number at 64 and at 128 bits; the mode is optional and falls back to
  `numericConfig.defaultOverflowMode`, read on each call so changing the global
  takes effect immediately. One default at every width, so the same expression
  cannot mean different things depending on the type it was written for.
  
  Any non-negative width is legal, zero included: a zero-bit integer holds exactly
  one value, `0n`, whichever overflow mode is asked for, which is what a `/0`
  netmask and any other empty field need. Only the operations that admit a value
  reject a bad width — the `*From` gates and the two `*IsInRange` queries throw
  `RangeError` unless the width is a non-negative safe integer. `fixedUIntBigMax`,
  `fixedSIntBigMax` and `fixedSIntBigMin` take a width and nothing else, so they
  validate nothing and an out-of-domain width is the caller's to avoid.
  
  Overflow is decided against the exact result rather than against one a hardware
  multiply has already truncated, so `clamp` saturates at the true value:
  `fixedSIntBigMul(16n, 16n, 8, "clamp")` is `127n`, not the `0n` the low eight
  bits of 256 would give.
  
  Nothing is included that would forward to an operator: `&`, `|` and `^` are
  closed over both ranges, a signed `~v` is already in range, and an unsigned
  quotient of two in-range values cannot overflow. `fixedUIntBigNot` exists
  because the unsigned complement is the one that does not fit.

### Patch Changes

- Updated dependencies [a5c4d66]
- Updated dependencies [a5c4d66]
  - @ac-kit/core@0.3.0
  - @ac-kit/math-integer@0.2.0
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
  - @ac-kit/math-integer@0.1.1
