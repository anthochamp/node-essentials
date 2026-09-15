# @ac-kit/math-stats

Descriptive statistics, probability distributions and statistical inference over
samples of `number`.

## Scope

Summarising a dataset, and reasoning about the process that produced it. The
input is always a collection of observations; the output is a statistic, a
distribution parameter, or a model.

## Contents

| Symbol                  | Description                                                            |
| ----------------------- | ---------------------------------------------------------------------- |
| `mean(values)`          | Arithmetic mean                                                        |
| `geometricMean(values)` | `n`-th root of the product; for ratios and growth rates                |
| `harmonicMean(values)`  | Reciprocal of the mean of reciprocals; for rates over a fixed distance |
| `midrange(values)`      | `(min + max) / 2`                                                      |

## Which mean

The three means answer different questions and are not interchangeable:

- **Arithmetic** — the value that preserves the _sum_. Use for quantities that
  add: durations, counts, sizes.
- **Geometric** — the value that preserves the _product_. Use for quantities
  that compound: growth rates, returns, ratios of ratios. The arithmetic mean of
  a +50 % year and a −50 % year is 0 %; the geometric mean correctly reports the
  −13.4 % that actually happened.
- **Harmonic** — the value that preserves the _sum of reciprocals_. Use for
  rates measured over a fixed quantity: the average speed over equal distances,
  or an F₁ score over precision and recall.

They satisfy `harmonic ≤ geometric ≤ arithmetic` for positive values, with
equality only when every value is identical.

## Distributions

Every family is a factory returning a `Distribution` — `density`, `cdf`,
`survival`, `quantile`, `sample`, `mean`, `variance`.

| Continuous | Discrete |
| --- | --- |
| `normalDistribution`, `logNormalDistribution` | `binomialDistribution` |
| `exponentialDistribution`, `uniformDistribution` | `poissonDistribution` |
| `gammaDistribution`, `chiSquaredDistribution` | `geometricDistribution` |
| `studentTDistribution`, `betaDistribution` | `negativeBinomialDistribution` |
| `fDistribution` | `hypergeometricDistribution` |

**`survival` is not a convenience over `1 - cdf(x)`.** It is the member the rest
is built around: a p-value _is_ an upper tail, and `1 - cdf(x)` is exactly `0`
once `cdf(x)` rounds to 1 — from about four standard deviations out for the
normal. Every family computes it directly, so a p-value of `1e-64` comes back as
`1e-64` rather than as zero.

`geometricDistribution` counts **failures** before the first success, so its
support starts at 0 and `geometricDistribution(p)` is exactly
`negativeBinomialDistribution(1, p)`. Libraries that count trials instead report
one more throughout.

`sample` draws by inverse transform and takes an optional uniform source, so
passing a seeded generator from `@ac-kit/math-random` makes a draw reproducible.

## Inference

| Symbol | Description |
| --- | --- |
| `tTest(sample, other, options)` | One-sample, two-sample, paired and pooled |
| `welchTStatistic(a, b)` | The statistic alone, for callers thresholding on it |
| `chiSquaredTest(observed, expected, options)` | Pearson's goodness of fit |
| `oneWayAnova(groups)` | Whether several groups share a common mean |

`tTest` reads its form from its arguments rather than from an option: a number
as the second argument is a hypothesised mean, an array is a second sample.

## Usage

```ts
import { geometricMean, mean, normalDistribution, tTest } from "@ac-kit/math-stats";

mean(1, 2, 3, 4); // 2.5
geometricMean(1.5, 0.5); // ≈ 0.866 — a 13.4 % compounded loss

normalDistribution(0, 1).survival(6); // 9.87e-10, where 1 - cdf(6) is 0
tTest([5.1, 4.9, 5.3], [5.9, 6.1, 5.8]).pValue; // ≈ 0.0011
```

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/math-stats/)
for the full reference.
