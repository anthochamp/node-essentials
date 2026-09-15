# @ac-kit/math-algebra

The universal-algebra vocabulary shared by every numeric type in the workspace:
the interface hierarchy `magma → semigroup → monoid → group → ring → field`, the
order and Euclidean extensions, and the typeclass-style _evidence_ types that
let a generic algorithm work over any structure satisfying the laws it needs.

This package contains no concrete numbers. It is the leaf of the `math-*`
dependency graph, in the same position as Rust's `num-traits`.

## Why two shapes for the same idea

Each algebraic structure appears twice, and the distinction is deliberate.

**F-bounded interfaces** (`IRing<T extends IRing<T>>`) express _structural_
typing: a type that **is** a ring, whose own methods are the ring operations.

```ts
class Fraction implements IField<Fraction> {
  add(other: Fraction): Fraction { … }
  inv(): Fraction { … }
}
```

**Evidence types** (`Ring<T>`) express a value you **pass**, carrying the
operations for some `T`:

```ts
function gcd<T>(a: T, b: T, domain: EuclideanDomain<T>): T;

gcd(a, b, Integer.euclideanDomain);
```

The evidence form is what generic algorithms need, for three reasons:

1. **A type may satisfy a weaker structure than it is asked for.** `Integer` is
   not a field — there is no `inv(): Integer` — but it _is_ a Euclidean domain,
   so it can be passed to `gcd`.
2. **Non-commutative and non-associative structures cannot implement `IField`.**
   The quaternions ℍ use `DivisionRing<T>`; the octonions 𝕆 use
   `CompositionAlgebra<T, R>`. Each evidence type encodes exactly the laws the
   algorithm relies on.
3. **Algorithms parameterised by algebraic strength stay reusable.** A matrix
   solver written against `Field<T>` runs over ℚ, ℝ and ℂ with no change.

## Contents

### Interface hierarchy

| Interface                 | Structure       | Laws added                                |
| ------------------------- | --------------- | ----------------------------------------- |
| `IMagma<T>`               | (S, ·)          | closure                                   |
| `ISemigroup<T>`           | (S, ·)          | associativity                             |
| `IMonoid<T>`              | (S, ·, 1)       | identity                                  |
| `IGroup<T>`               | (S, ·, 1, ⁻¹)   | inverses                                  |
| `IAbelianGroup<T>`        | (S, ·, 1, ⁻¹)   | commutativity                             |
| `IAdditive<T>`            | (S, +)          | additive closure                          |
| `IAdditiveCommutative<T>` | (S, +)          | additive commutativity                    |
| `IAdditiveGroup<T>`       | (S, +, 0, −)    | additive inverses                         |
| `IRing<T>`                | (R, +, ·, 0, 1) | distributivity                            |
| `ICommutativeRing<T>`     |                 | multiplicative commutativity              |
| `IIntegralDomain<T>`      |                 | no zero divisors                          |
| `IField<T>`               | (F, +, ·, 0, 1) | every non-zero element invertible         |
| `IOrdered<T>`             |                 | a compatible total order                  |
| `IOrderedField<T>`        |                 | order compatible with the ring operations |
| `IEuclidean<T>`           |                 | division with remainder                   |
| `IBitwise<T>`             |                 | a binary representation                   |

The hierarchy is encoded structurally, never as boolean flags. A type whose
operation is not associative simply does not extend `ISemigroup`, and the
compiler rejects passing it where associativity is assumed.

### Evidence types

`Ring<T>`, `EuclideanDomain<T>`, `Field<T>`, `OrderedField<T>`,
`DivisionRing<T>`, `CompositionAlgebra<T, R>`.

### Format markers

`IFixedPrecision` and `IArbitraryPrecision` distinguish types with a bounded
representable range from those bounded only by memory; `IBinaryEncoded` and
`IDecimalEncoded` record the radix. These drive whether an overflow policy
applies at all.

### Algorithms

`gcd` and `extendedGcd`, generic over any `EuclideanDomain<T>`.

## Usage

```ts
import { extendedGcd, type EuclideanDomain } from "@ac-kit/math-algebra";

const integers: EuclideanDomain<bigint> = {
  zero: 0n,
  one: 1n,
  add: (a, b) => a + b,
  sub: (a, b) => a - b,
  neg: (a) => -a,
  mul: (a, b) => a * b,
  eq: (a, b) => a === b,
  degree: (a) => Number(a < 0n ? -a : a),
  divmod: (a, b) => ({ quotient: a / b, remainder: a % b }),
};

extendedGcd(240n, 46n, integers); // { gcd: 2n, x: -9n, y: 47n }
```

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/math-algebra/)
for the full reference.
