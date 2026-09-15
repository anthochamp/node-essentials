// Private module — not exported from numbers/index.ts.
// Provides default implementations of IOrdered comparison methods
// in terms of `cmp`. Concrete classes mixin this to avoid boilerplate.

import type { IOrdered } from "./ordered.js";
import { Sign } from "./sign.js";

/** Returns `true` if `self = other` (derived from `cmp`). */
export function orderedEq<T extends IOrdered<T>>(self: T, other: T): boolean {
	return self.cmp(other) === 0;
}

/** Returns `true` if `self < other` (derived from `cmp`). */
export function orderedLt<T extends IOrdered<T>>(self: T, other: T): boolean {
	return self.cmp(other) === -1;
}

/** Returns `true` if `self ≤ other` (derived from `cmp`). */
export function orderedLte<T extends IOrdered<T>>(self: T, other: T): boolean {
	return self.cmp(other) !== 1;
}

/** Returns `true` if `self > other` (derived from `cmp`). */
export function orderedGt<T extends IOrdered<T>>(self: T, other: T): boolean {
	return self.cmp(other) === 1;
}

/** Returns `true` if `self ≥ other` (derived from `cmp`). */
export function orderedGte<T extends IOrdered<T>>(self: T, other: T): boolean {
	return self.cmp(other) !== -1;
}

/**
 * Abstract base class that provides default implementations of all
 * {@link IOrdered} boolean comparison methods (`eq`, `lt`, `lte`, `gt`, `gte`)
 * derived from the single abstract `cmp` method.
 *
 * @template T The concrete numeric type.
 */
export abstract class OrderedBase<
	T extends OrderedBase<T>,
> implements IOrdered<T> {
	abstract cmp(other: T): Sign;

	eq(other: T): boolean {
		return this.cmp(other) === 0;
	}

	lt(other: T): boolean {
		return this.cmp(other) === -1;
	}

	lte(other: T): boolean {
		return this.cmp(other) !== 1;
	}

	gt(other: T): boolean {
		return this.cmp(other) === 1;
	}

	min(other: T): T {
		return orderedMin(this as unknown as T, other);
	}

	max(other: T): T {
		return orderedMax(this as unknown as T, other);
	}

	clamp(lower: T, upper: T): T {
		return orderedClamp(this as unknown as T, lower, upper);
	}

	gte(other: T): boolean {
		return this.cmp(other) !== -1;
	}
}

/** Returns the smaller of `self` and `other` (derived from `cmp`). */
export function orderedMin<T extends IOrdered<T>>(self: T, other: T): T {
	return self.cmp(other) === 1 ? other : self;
}

/** Returns the larger of `self` and `other` (derived from `cmp`). */
export function orderedMax<T extends IOrdered<T>>(self: T, other: T): T {
	return self.cmp(other) === -1 ? other : self;
}

/**
 * Constrains `self` to `[lower, upper]` (derived from `cmp`).
 *
 * @throws {RangeError} If `lower > upper`.
 */
export function orderedClamp<T extends IOrdered<T>>(
	self: T,
	lower: T,
	upper: T,
): T {
	if (lower.cmp(upper) === 1) {
		throw new RangeError("clamp: lower bound exceeds upper bound");
	}
	return orderedMin(orderedMax(self, lower), upper);
}
