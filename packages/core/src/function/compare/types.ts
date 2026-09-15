import type { Callable, Predicate } from "../../types/callable.js";

export type ComparatorResult = -1 | 0 | 1;

/**
 * Orders `a` against `b`: `-1` if `a` precedes `b`, `0` if the two are
 * equivalent, `1` if `a` follows `b`.
 *
 * Must be a strict weak ordering — irreflexive, antisymmetric and transitive,
 * with transitive equivalence. Sorting, bisecting, heaps and ordered ranges all
 * assume it, and a comparator that breaks it makes their results unspecified
 * rather than merely imprecise. An approximate comparison is therefore never a
 * valid comparator: tolerant equivalence is not transitive.
 *
 * `A` and `B` differ when the search target need not share the collection's
 * element type — bisecting an array of records by a plain numeric key, say.
 */
export type Comparator<A, B = A> = Callable<[A, B], ComparatorResult>;

/**
 * Strict weak ordering as a boolean: `true` if `a` must come before `b`.
 *
 * Carries exactly the same information as a {@link Comparator} — equivalence is
 * recoverable as `!precedes(a, b) && !precedes(b, a)` — but at two calls rather
 * than one.
 */
export type OrderPredicate<A, B = A> = Predicate<[A, B]>;

/**
 * How far apart `a` and `b` are.
 *
 * Must be a true metric: non-negative, symmetric, `0` exactly when the two are
 * equivalent, and satisfying the triangle inequality. Metric-space indexes
 * prune entire subtrees on the strength of that last property, so a distance
 * that violates it makes their results wrong, not merely slower.
 *
 * Not a {@link Comparator}: it answers how far apart, never which comes first.
 * To order candidates by closeness to a query, derive one —
 * `createComparatorBy((item) => distance(query, item))`.
 */
export type Distance<T> = Callable<[T, T], number>;
