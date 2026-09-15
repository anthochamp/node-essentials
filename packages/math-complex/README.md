# @ac-kit/math-complex

Complex numbers and their extensions: the finite-dimensional algebras over ℝ.

## Scope

A value here is a fixed-arity tuple of binary64 components plus a multiplication
rule: the complex numbers ℂ and the quaternions ℍ. They belong together because
they are one construction — Cayley–Dickson generates ℂ → ℍ mechanically, and
both share the same shape, the same throughput concerns and the same algebraic
vocabulary.

These are deliberately not part of `@ac-kit/math-numbers`. That package owns the
number tower ℕ ⊆ ℤ ⊆ ℚ ⊆ ℝ, whose members promote between each other under a
shared rounding, overflow and exactness policy. Nothing here promotes, rounds or
overflows, so none of that machinery applies.

`@ac-kit/math-linear` builds on the ℍ defined here: this package owns the
division-ring operations (multiplication, conjugate, inverse, norm), while the
rotation reading of a unit quaternion — axis and angle, Euler conversion,
rotation matrices, slerp — lives there.

## Contents

| Symbol                                                                  | Description                            |
| ----------------------------------------------------------------------- | -------------------------------------- |
| `Complex`                                                               | `[re, im]` tuple                       |
| `COMPLEX_ZERO`, `COMPLEX_ONE`, `COMPLEX_I`                              | Constants                              |
| `complexAdd`, `complexSub`, `complexMul`, `complexDiv`, `complexNeg`    | Field operations                       |
| `complexConjugate`                                                      | `a − bi`                               |
| `complexModulus`, `complexModulusSq`                                    | `\|z\|` and `\|z\|²`                   |
| `complexArgument`                                                       | Principal argument in `(−π, π]`        |
| `complexFromPolar`, `complexCis`                                        | Polar construction and Euler's formula |
| `complexExp`, `complexLog`                                              | Exponential and principal logarithm    |
| `Quaternion`, `QUATERNION_IDENTITY`                                     | `[x, y, z, w]` tuple and the unit      |
| `quaternionAdd`, `quaternionSub`, `quaternionNeg`, `quaternionMultiply` | Ring operations                        |
| `quaternionConjugate`, `quaternionInverse`                              | Division-ring operations               |
| `quaternionLength`, `quaternionLengthSq`, `quaternionNormalize`         | The ℍ norm and its unit form           |
| `quaternionDot`, `quaternionEquals`, `quaternionIsClose`                | Inner product and comparison           |
| `ComplexNum`, `QuaternionNum`                                           | Boxed field/ring values over ℂ and ℍ   |

`ComplexNum` and `QuaternionNum` box a value with its own field or ring API —
delegating every operation to the free functions above, no arithmetic of their
own. They are deliberately not a genericity mechanism: an algorithm that works
over an arbitrary field or division ring takes `Field<T>` or `DivisionRing<T>`
evidence from `@ac-kit/math-algebra`, which costs no virtual dispatch.

## Division

`complexDiv` uses Smith's algorithm rather than the textbook
`(ac + bd) / (c² + d²)` form. The naive version squares both components of the
divisor, so it overflows for `|z| > √(MAX_VALUE)` and underflows for very small
divisors even when the true quotient is perfectly representable. Smith's
formulation divides by the larger component first, keeping every intermediate
within range.

## Usage

```ts
import { complexMul, complexModulus, COMPLEX_I } from "@ac-kit/math-complex";

complexMul(COMPLEX_I, COMPLEX_I); // [-1, 0]
complexModulus([3, 4]); // 5
```

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/math-complex/)
for the full reference.
