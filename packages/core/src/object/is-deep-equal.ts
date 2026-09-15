import { isDate } from "../guards/is-date.js";
import { isMap } from "../guards/is-map.js";
import { isPojo } from "../guards/is-pojo.js";
import { isRegExp } from "../guards/is-regexp.js";
import { isSet } from "../guards/is-set.js";
import { isEqual, type EqualityComparisonStrategy } from "./is-equal.js";

/**
 * Compare two values for deep equality using the specified strategy.
 *
 * Supported strategies: `"strict"`, `"loose"`, `"sameValue"`,
 * `"sameValueZero"`, or a custom predicate `(a, b) => boolean`.
 *
 * For structural types (plain objects, arrays, `Map`, `Set`) the structure is
 * always compared recursively; the strategy is applied at each leaf. For `Date`
 * and `RegExp` the strategy compares `.getTime()` / `.source` + `.flags`
 * respectively — except when a predicate is used, in which case the predicate
 * receives the raw `Date` / `RegExp` objects.
 *
 * @param a First value to compare
 * @param b Second value to compare
 * @param comparisonStrategy The equality comparison strategy to use (default is
 *   `"strict"`)
 * @returns True if the values are deeply equal, false otherwise
 */
export function isDeepEqual(
	a: unknown,
	b: unknown,
	comparisonStrategy: EqualityComparisonStrategy<unknown, unknown> = "strict",
): boolean {
	return deepEqualInternal_(a, b, comparisonStrategy, new WeakMap());
}

function deepEqualInternal_(
	a: unknown,
	b: unknown,
	strategy: EqualityComparisonStrategy<unknown, unknown>,
	seen: WeakMap<object, object>,
): boolean {
	// Null and primitives go straight to leaf comparison
	if (
		a === null ||
		b === null ||
		typeof a !== "object" ||
		typeof b !== "object"
	) {
		return isEqual(a, b, strategy);
	}

	// Same reference is always equal regardless of strategy
	if (a === b) return true;

	// Cycle detection: seeing the same pair again means we're in a cycle
	if (seen.get(a) === b) return true;
	seen.set(a, b);

	if (isDate(a) || isDate(b)) {
		if (!isDate(a) || !isDate(b)) {
			return typeof strategy === "function" && strategy(a, b);
		}
		return typeof strategy === "function"
			? strategy(a, b)
			: isEqual(a.getTime(), b.getTime(), strategy);
	}

	if (isRegExp(a) || isRegExp(b)) {
		if (!isRegExp(a) || !isRegExp(b)) {
			return typeof strategy === "function" && strategy(a, b);
		}
		return typeof strategy === "function"
			? strategy(a, b)
			: isEqual(a.source, b.source, strategy) &&
					isEqual(a.flags, b.flags, strategy);
	}

	if (Array.isArray(a) || Array.isArray(b)) {
		if (!Array.isArray(a) || !Array.isArray(b)) {
			return typeof strategy === "function" && strategy(a, b);
		}
		if (a.length !== b.length) return false;
		for (let i = 0; i < a.length; i++) {
			if (!deepEqualInternal_(a[i], b[i], strategy, seen)) return false;
		}
		return true;
	}

	if (isMap(a) || isMap(b)) {
		if (!isMap(a) || !isMap(b)) {
			return typeof strategy === "function" && strategy(a, b);
		}
		if (a.size !== b.size) return false;
		for (const [key, value] of a) {
			if (!b.has(key)) return false;
			if (!deepEqualInternal_(value, b.get(key), strategy, seen)) return false;
		}
		return true;
	}

	// O(n²) matching to support unordered Set equality under any strategy
	if (isSet(a) || isSet(b)) {
		if (!isSet(a) || !isSet(b)) {
			return typeof strategy === "function" && strategy(a, b);
		}
		if (a.size !== b.size) return false;
		const unmatched = new Set(b);
		for (const ea of a) {
			let found = false;
			for (const eb of unmatched) {
				if (deepEqualInternal_(ea, eb, strategy, seen)) {
					unmatched.delete(eb);
					found = true;
					break;
				}
			}
			if (!found) return false;
		}
		return true;
	}

	if (isPojo(a) && isPojo(b)) {
		const aKeys = Object.keys(a);
		if (aKeys.length !== Object.keys(b).length) return false;
		for (const key of aKeys) {
			if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
			if (!deepEqualInternal_(a[key], b[key], strategy, seen)) return false;
		}
		return true;
	}

	// Unhandled object types (class instances, etc.)
	return isEqual(a, b, strategy);
}
