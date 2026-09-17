# @ac-kit/math-integer

Number theory on ℤ over the native `number` and `bigint` types: divisibility,
primality, modular arithmetic, and named integer encodings.

## Scope

Everything whose domain is the integers and has no `Math`/`bigint` equivalent to
complete — a real number-theoretic identity or a named construction you look up,
not a gap in what the primitive already offers.

What lives **elsewhere**:

- Boxed integer _types_ with an overflow policy (`Integer32`, `Natural64`, …) —
  `@ac-kit/math-numbers`. This package operates on the primitives; that one
  defines new representations.
- Counting problems (`factorial`, `binomial`) — `@ac-kit/math-combinatorics`.
- Anything returning a non-integer — `@ac-kit/math-scalar`.
- Bit rotation, masking, division/remainder/bit-length/exact-sqrt on `bigint` —
  `@ac-kit/core`. Those complete an operation the primitive itself is missing
  (no rotate operator, no floor-division, square-and-multiply is an algorithm
  rather than a number-theoretic identity), so they carry no number-theoretic
  identity of their own; they moved out from under this package once that
  stopped being a distinction worth a package boundary.
- Constant-time modular arithmetic — `@ac-kit/crypto-safe`. The limb functions
  here are ordinary variable-time arithmetic and make no timing claim; see
  "Digit arrays" below.

## Contents

| Symbol                        | Description                                             |
| ----------------------------- | ------------------------------------------------------- |
| `bigIntDivmod(a, b)`          | Euclidean quotient and remainder pair                   |
| `bigIntGcd(a, b)`             | Greatest common divisor, binary (Stein) algorithm       |
| `bigIntLcm(a, b)`             | Least common multiple                                   |
| `bigIntIsPrime(n)`            | Deterministic Miller–Rabin primality test               |
| `bigIntModPow(b, e, m)`       | Modular exponentiation, square-and-multiply algorithm   |
| `cantorPairing(x, y)`         | Bijection ℕ × ℕ → ℕ, `((x + y)(x + y + 1)) / 2 + y`     |
| `cantorUnpairing(z)`          | The inverse of `cantorPairing`                          |
| `limb32FromBigInt(v, words)`  | Little-endian 32-bit limbs; truncates to `words`        |
| `limb32ToBigInt(limbs)`       | The inverse of `limb32FromBigInt`                       |
| `limb32BitLength(limbs)`      | Position of the highest set bit, plus one               |
| `limb32IsZero(limbs)`         | Whether every limb is zero                              |
| `limb32Increment(limbs)`      | `limbs + 1`, carry propagated, width preserved          |
| `limb32ShiftLeft(limbs, n)`   | Shift left, dropping bits past the top                  |
| `limb32ShiftRightTrunc(l, n)` | Shift right, truncating                                 |
| `limb64FromBigInt(v, words)`  | Little-endian 64-bit limbs; throws rather than truncate |
| `limb64ToBigInt(limbs)`       | The inverse of `limb64FromBigInt`                       |

## Digit arrays

One `bigint` split into fixed-width digits, in the three widths the tree needs.
They are the same operation with four parameters set differently:

| family     | package             | digit  | order         | sign             | width   |
| ---------- | ------------------- | ------ | ------------- | ---------------- | ------- |
| `…BytesBe` | `@ac-kit/core`      | 8-bit  | big-endian    | two's complement | minimal |
| `limb32…`  | `@ac-kit/math-integer` | 32-bit | little-endian | unsigned         | fixed   |
| `limb64…`  | `@ac-kit/math-integer` | 64-bit | little-endian | unsigned         | fixed   |

Big-endian and two's complement is what a wire format wants — X.690 §8.3 for an
ASN.1 INTEGER, and what Java's `BigInteger.toByteArray` and Python's
`int.to_bytes` produce. That makes the byte member useful to parsers that need
no arithmetic at all, which is why `bigIntToBytesBe` and `bigIntFromBytesBe`
live in `@ac-kit/core` rather than here. Little-endian and unsigned is what
arithmetic wants, because a carry propagates from index 0 upward.

**There is deliberately no width-generic entry point.** A single call site over
several typed-array kinds measures 18.6× slower than a monomorphic one: the
engine cannot keep the element access inline once more than one array shape
reaches it.

Nothing here is constant-time. `limb64FromBigInt` and `limb64ToBigInt` are the
public-value boundary of `@ac-kit/crypto-safe`'s constant-time kernel, and they
live here rather than there precisely so that a plain name in that package never
reads as a timing guarantee.

## Cantor pairing

`cantorPairing` enumerates ℕ² by diagonals, so it is a genuine bijection rather
than a hash: distinct pairs never collide, and `cantorUnpairing` recovers the
original pair exactly. This makes it usable as a composite key for a `Map` or a
sparse grid, provided both inputs stay below `2^26` so the result remains a safe
integer.

## Usage

```ts
import { cantorPairing, cantorUnpairing } from "@ac-kit/math-integer";

cantorPairing(3, 5); // 41
cantorUnpairing(41); // [3, 5]
```

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/math-integer/)
for the full reference.
