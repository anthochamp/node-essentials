# @ac-kit/math-scalar

Scalar operations on the native IEEE 754 `number`. This is the foundation of the
`math-*` family — every other package that manipulates floats depends on it, and
it carries no runtime dependencies of its own.

## Scope

Operations that take one or more `number` values and return a `number` — or, for
the axis-tick family, a sequence of them — plus the mathematical constants that
are not in the `Math` namespace. This is also where the error-free
transformations live: the primitives that recover the bits binary64 arithmetic
throws away, and the fixed-arity kernels built on them.

What lives **elsewhere**:

- `clamp`, `scale1`, `toFixedLength`, `compare` — general number utilities in
  `@ac-kit/core`; they are not mathematics, they are data handling.
- `round` with a rounding method — `@ac-kit/core`, since it wraps the language's
  own `Math.round` family. Full IEEE 754 rounding modes (half-even, half-down,
  …) belong to `@ac-kit/math-numbers`.
- `isClose`, `isCloseRelative` — also `@ac-kit/core`, for the same reason: they
  operate on `number` but need no mathematical concept to understand, unlike
  `lerp` or `pingpongStep` below.
- `sumPrecise` and `PreciseSum` — `@ac-kit/core`. `Math.sumPrecise` is a TC39
  proposal, so the polyfill belongs in the substrate rather than here.
- Integer and bitwise operations — `@ac-kit/math-integer`.

## Contents

| Symbol                                 | Description                                                    |
| -------------------------------------- | -------------------------------------------------------------- |
| `lerp(a, b, t)`                        | Linear interpolation `a + (b − a)·t`                           |
| `linspace(start, stop, count)`         | `count` evenly spaced samples, both endpoints included         |
| `pingpongStep(current, delta, max)`    | Advances a 1D position, bouncing at `0` and `max`              |
| `DEG_TO_RAD`, `RAD_TO_DEG`, `TWO_PI`   | Angle conversion factors and τ                                 |
| `twoSumError(a, b, sum)`               | The bits `a + b` dropped — Knuth's two-sum                     |
| `fastTwoSumError(a, b, sum)`           | The same when `a` is the larger term — Dekker, half the work    |
| `twoProductError(a, b, product)`       | The bits `a * b` dropped — Dekker's two-product                |
| `diffOfProducts(a, b, c, d)`           | `a·b − c·d` to 1.5 ulp however badly the products cancel       |
| `sumOfProducts(a, b, c, d)`            | `a·b + c·d`, the companion of the above                        |
| `dotPrecise(a, b)`                     | N-term compensated dot product (Ogita–Rump–Oishi)              |

## Accuracy

The error-free transformations recover the rounding error of a single operation
exactly, so a caller can fold it back in instead of losing it. `twoSumError` and
`twoProductError` are the raw primitives; `diffOfProducts`, `sumOfProducts` and
`dotPrecise` are the kernels worth reaching for directly.

Use them wherever signed terms can cancel — determinants, cross products,
intersection denominators, complex and quaternion products, discriminants.
There the naive expression can be wrong in every surviving bit, and in situ they
cost 1.4× to 1.9× the naive loop, so they are applied unconditionally rather
than behind an option.

They fix the error of the **operations**, not of a variable-length total: for
that, reach for `@ac-kit/core`'s `sumPrecise`, which is exactly rounded.

## Usage

```ts
import { diffOfProducts, lerp } from "@ac-kit/math-scalar";

lerp(10, 20, 0.25); // 12.5

// Both products round to 2**54 + 2**28, so the naive expression answers 0.
const [a, b, c, d] = [2 ** 27 + 1, 2 ** 27 + 1, 2 ** 27, 2 ** 27 + 2];
diffOfProducts(a, b, c, d); // 1
```

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/math-scalar/)
for the full reference.
