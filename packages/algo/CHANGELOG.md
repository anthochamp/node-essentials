# Changelog

## 0.2.0

### Minor Changes

- a5c4d66: New `mergeIntervals`, `intersectIntervals`, `complementIntervals` and
  `subtractIntervals`, a complete set algebra over the flat, stride-2
  `[start, end, …]` form `isInSortedIntervals` already speaks. Input and output
  are both that form, so one feeds the next and no interval object is allocated on
  the way through.
  
  `mergeIntervals(intervals, compare, isAdjacent?)` sorts and coalesces a set into
  the minimal disjoint set covering the same points — the preprocessing step
  `isInSortedIntervals` assumed somebody else had done and had no companion that
  produced. Touching and adjacent are kept as separate questions: `[1, 5]` and
  `[5, 9]` share the point 5 and always merge; `[1, 2]` and `[3, 4]` share
  nothing, and whether they should still become `[1, 4]` depends on whether the
  bound type has anything between 2 and 3 — the integers do not, the reals do.
  `isAdjacent` is how a caller says which it holds, and omitting it merges
  overlaps only.
  
  `intersectIntervals(a, b, compare)` is one merge walk, O(n + m), and needs
  nothing beyond the comparator: every bound it emits is a bound one of the inputs
  already named.
  
  `complementIntervals(intervals, bounds, compare, step)` and
  `subtractIntervals(a, b, compare, step)` take the new `IntervalStep<T>`, a
  `{ next, previous }` pair, because they are the two that have to name a point
  just outside an interval — removing `[3, 5]` from `[0, 10]` leaves `[0, 2]` and
  `[6, 10]`, and neither 2 nor 6 can be derived from a comparator. That also marks
  them as discrete-domain operations: over the reals the result is genuinely not
  expressible as closed intervals, and no `IntervalStep` can be written.
  `INTEGER_INTERVAL_STEP` and `BIG_INT_INTERVAL_STEP` ship for the two common
  cases.
  
  Those three require ascending, disjoint input, as `isInSortedIntervals` does,
  and all four preserve that property in their output — including non-adjacency,
  so a caller never has to re-run `mergeIntervals` on a result.

### Patch Changes

- Updated dependencies [a5c4d66]
- Updated dependencies [a5c4d66]
  - @ac-kit/core@0.3.0
  - @ac-kit/data@0.1.2

## 0.1.1

### Patch Changes

- Updated dependencies [a493b4a]
- Updated dependencies [a493b4a]
- Updated dependencies [a493b4a]
- Updated dependencies [2ab5593]
- Updated dependencies [a493b4a]
  - @ac-kit/core@0.2.0
  - @ac-kit/data@0.1.1

## [0.1.0] - 2026-09-01

### Added

- Initial release.
