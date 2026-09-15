# @ac-kit/math-combinatorics

Counting and enumeration over finite sets.

## Scope

Two distinct kinds of result live here:

- **Counting functions** return how many arrangements exist — `factorial`,
  `binomial`, `catalan`. They return `bigint`, because the counts grow beyond
  `Number.MAX_SAFE_INTEGER` almost immediately (`21!` already exceeds it).
- **Enumeration over integers** yields the arrangements themselves, where what
  is arranged is a number rather than a caller's data — the partitions of `n`,
  for instance. Generators rather than arrays, since the output is exponential
  in the input and callers usually want to stop early.

Enumerating arrangements of _your_ items — permutations, combinations, the power
set, the cartesian product — is `@ac-kit/algo`'s `combinatorics/`. Those are
generic over an arbitrary `T` and never compute on a number, so they are
algorithms rather than mathematics.

Divisibility, primality and modular arithmetic are number theory, not counting:
they live in `@ac-kit/math-integer`.

## Contents

| Symbol           | Description                                        |
| ---------------- | -------------------------------------------------- |
| `factorial(n)`   | `n!`, exact                                        |
| `binomial(n, k)` | `C(n, k)`, the number of `k`-subsets of an `n`-set |

## Exact by construction

`binomial` uses the multiplicative recurrence
`C(n, k) = C(n, k−1) × (n − k + 1) / k` rather than `n! / (k!(n−k)!)`. Each
intermediate is itself a binomial coefficient, so every division is exact and no
intermediate factorial is ever formed. The symmetry `C(n, k) = C(n, n − k)`
bounds the loop at `min(k, n − k)` iterations.

## Usage

```ts
import { binomial, factorial } from "@ac-kit/math-combinatorics";

factorial(20); // 2432902008176640000n
binomial(52, 5); // 2598960n — five-card poker hands
```

See the
[generated API docs](https://anthochamp.github.io/node-essentials/api/math-combinatorics/)
for the full reference.
