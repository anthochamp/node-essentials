# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-08-24

### Added

- `mean`, `geometricMean`, `harmonicMean`, `rootMeanSquare`, `median`, `mode`,
  and `midrange` statistical functions, extracted from `@ac-essentials/util` and
  grouped here as a dedicated math library.
- Array overloads on all variadic functions. The variadic form still works, but
  it forces the caller to spread and throws `RangeError` past roughly 100 000
  values.
- `geometricMean` sums logarithms instead of multiplying, so it no longer
  underflows to zero on more than a few hundred values below one.
- `median` uses selection instead of a full sort, and no longer modifies the
  input array.
