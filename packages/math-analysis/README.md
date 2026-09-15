# @ac-kit/math-analysis

Numerical analysis: approximating the operations of continuous mathematics —
roots, integrals, derivatives, differential equations — with a finite number of
floating-point steps.

## Scope

Every function here takes a callable `f: (x: number) => number` and returns an
approximation with a stated error behaviour. That is the distinguishing trait:
the input is a _function_, not a value.

Operations on values live in `@ac-kit/math-scalar`; operations on sampled
sequences live in `@ac-kit/math-signal`.

## Contents

| Symbol                                        | Description                                                  | Convergence            |
| --------------------------------------------- | ------------------------------------------------------------ | ---------------------- |
| `bisect(f, lower, upper, options)`            | Root of a continuous function within a sign-changing bracket | linear, `(b − a) / 2ⁿ` |
| `trapezoidalRule(f, lower, upper, intervals)` | Definite integral by piecewise linear approximation          | `O(h²)`                |
| `continuedFractionEval(fraction, options)`    | Value of a continued fraction, by modified Lentz             | forward, no truncation guess |

### Special functions

| Symbol | Description |
| --- | --- |
| `gamma(x)`, `logGamma(x)` | The gamma function and its logarithm |
| `beta(a, b)`, `logBeta(a, b)` | `Γ(a)Γ(b) / Γ(a + b)`, and its logarithm |
| `erf(x)`, `erfc(x)` | Error function and its complement |
| `regularizedIncompleteGamma(a, x)` | `P(a, x)` — lower tail of a `Gamma(a, 1)` |
| `regularizedIncompleteGammaUpper(a, x)` | `Q(a, x)` — upper tail, computed directly |
| `inverseRegularizedIncompleteGamma(a, p)` | The `x` with `P(a, x) = p` |
| `regularizedIncompleteBeta(a, b, x)` | `Iₓ(a, b)` — lower tail of a `Beta(a, b)` |
| `inverseRegularizedIncompleteBeta(a, b, p)` | The `x` with `Iₓ(a, b) = p` |

Each name says "regularized" rather than leaving it to be inferred: libraries
disagree over whether the bare name means the ratio in `[0, 1]` or the
unnormalised integral, and the two differ by a factor no caller should have to
guess at. Parameters lead and the variable trails throughout, so the gamma and
beta families agree on argument order.

**Reach for the upper form when the answer is small.** `Q(a, x)` and `erfc(x)`
are not conveniences over `1 − P(a, x)` and `1 − erf(x)`: that subtraction has
already discarded the whole answer by the time it is worth asking for. `erf(10)`
is exactly `1` in binary64, while `erfc(10)` is `2.09e-45` and correct.

## Reliability over speed

`bisect` converges linearly, which is slow next to Newton's quadratic rate. It
is nonetheless the right default: given a bracket where `f` changes sign, the
intermediate value theorem guarantees a root inside, and bisection cannot fail
to find it. Newton's method diverges from a poor starting point, stalls at
inflection points, and needs a derivative. Faster methods belong here too, but
as explicit choices, not as the default.

## Usage

```ts
import { bisect, trapezoidalRule } from "@ac-kit/math-analysis";

bisect((x) => x * x - 2, 0, 2); // ≈ 1.4142135623…
trapezoidalRule(Math.sin, 0, Math.PI); // ≈ 2
```

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/math-analysis/)
for the full reference.
