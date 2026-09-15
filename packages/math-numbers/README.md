# @ac-kit/math-numbers

Concrete numeric _representations_ — the number tower ℕ ⊆ ℤ ⊆ ℚ ⊆ ℝ, plus the
fixed-width and arbitrary-precision types that model each set on a computer.

Where `math-scalar` and `math-integer` operate on the primitives JavaScript
already provides, this package defines new types that JavaScript lacks: exact
rationals, arbitrary-precision decimals, sized integers with a defined overflow
policy, and IEEE 754 formats other than binary64.

## Why one package rather than several

`Fraction`, `Integer` and `Decimal` are not independent. They share the algebra
interfaces they implement, the promotion table that resolves mixed operands, the
rounding and overflow policies, and the `Extended<T>` wrapper that adds NaN and
±∞ to any of them. Splitting them apart would put that shared core in a base
package and leave each type unable to convert to its neighbours without a
circular dependency. Java's `java.math` and Rust's `num` family make the same
grouping.

## Design

### Classes, not branded primitives

A branded primitive (`type Fraction = number & { __brand: "Fraction" }`) cannot
carry methods, and an ergonomic value API is the point of this package. Every
concrete type is therefore a class. `valueOf()` and `Symbol.toPrimitive` are
implemented so that `fraction + 2` still works where a lossy conversion is
acceptable.

The classes share no arithmetic base type. Anything generic over the carrier
takes evidence — `Ring<T>`, `Field<T>`, `EuclideanDomain<T>` from
`@ac-kit/math-algebra` — which each class exposes as a static, rather than an
inherited interface.

### `cmp()` returns `Sign`, not a number

A comparison result is not a member of the set being compared. `cmp` returns
`-1 | 0 | 1` from `@ac-kit/math-algebra`, which also breaks what would otherwise
be a circular dependency between the comparison and the numeric type.

### Fixed versus arbitrary precision

| Category  | Types                                                                    | Overflow                   |
| --------- | ------------------------------------------------------------------------ | -------------------------- |
| Fixed     | `Integer8/16/32/64/128`, `Natural8/16/32/64/128`, `BinaryFp16/32/64/128` | governed by `OverflowMode` |
| Arbitrary | `Integer`, `Decimal`, `Fraction`                                         | cannot overflow            |

The markers `IFixedPrecision` and `IArbitraryPrecision` make the distinction
checkable at compile time.

### `Extended<T>` for NaN and ±∞

`Integer`, `Fraction` and `Decimal` have no special values: they stay pure and
fast. `Extended<T>` is a decorator that adds NaN and ±∞ to any field type and
propagates them through every operation, forcing the caller to acknowledge them
at the extraction boundary (`unwrap`, `unwrapOr`, `match`). Only the `BinaryFp*`
types carry special values intrinsically, as IEEE 754 bit patterns.

### `DecimalContext` and `OverflowMode`

Operations whose exact result may not terminate — dividing repeating decimals,
taking a non-exact square root — take a `DecimalContext` carrying a precision
and a rounding mode. Integer and rational arithmetic is always exact and never
needs one. Fixed-width types take an `OverflowMode` of `wrap`, `clamp` or
`abort`.

## Contents

The concrete types, each a contract shell over free functions that carry the
arithmetic:

| Symbol                                    | Description                                                       |
| ----------------------------------------- | ----------------------------------------------------------------- |
| `Integer`                                 | Arbitrary-precision ℤ over `bigint`, with ring and Euclidean evidence |
| `Fraction`                                | Exact ℚ over a reduced `bigint` pair, with ordered-field evidence  |
| `DecimalNum`, `Decimal`                   | Arbitrary-precision decimal: `bigint` coefficient plus a scale     |
| `BinaryFp16/32/64/128`                    | IEEE 754 binary formats, soft-float where the hardware has none    |
| `Rational`, `rationalAdd`/`rationalMul`/… | The raw ℚ pair and its arithmetic, allocating no wrappers          |
| `IeeeBinary*`, `SoftFloatKernel`          | Unpacked IEEE records and the TS/WASM kernels behind `BinaryFp`    |

Plus the policy and platform layer every one of them shares:

| Symbol                                                                       | Description                                            |
| ---------------------------------------------------------------------------- | ------------------------------------------------------ |
| `RoundingMode`                                                               | The eleven arithmetic rounding modes; presentation uses `Intl`'s |
| `OverflowMode`, `OverflowError`                                              | Fixed-width overflow policy                            |
| `DecimalContext` + `MATH_CONTEXT_DECIMAL32/64/128`, `MATH_CONTEXT_UNLIMITED` | Precision settings for non-terminating operations      |
| `IntegralFractional`                                                         | Sign / integral part / fractional digits decomposition |
| `PrecisionKind`, `IFixedPrecision`, `IArbitraryPrecision`                    | Whether a type's range is bounded by a width           |
| `INT8_MIN` … `UINT128_MAX`, `DBL_*`                                          | Representable ranges per width                         |
| `IEEE_FORMAT_BINARY16/32/64/128`                                             | Format layouts (`k`, `p`, `emax`) and `ieeeEMin`       |

## Usage

```ts
import {
  DECIMAL_CONTEXT_IEEE_DECIMAL64,
  IEEE_FORMAT_BINARY64,
  ieeeEMin,
} from "@ac-kit/math-numbers";

IEEE_FORMAT_BINARY64.p; // 53 — precision in digits, leading digit included
IEEE_FORMAT_BINARY64.emax; // 1023
ieeeEMin(IEEE_FORMAT_BINARY64); // -1022
DECIMAL_CONTEXT_IEEE_DECIMAL64.precision; // 16
```

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/math-numbers/)
for the full reference.
