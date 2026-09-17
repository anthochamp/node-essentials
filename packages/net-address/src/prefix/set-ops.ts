import {
	BIG_INT_INTERVAL_STEP,
	intersectIntervals,
	subtractIntervals,
} from "@ac-kit/algo";
import { compareNaturalAscending } from "@ac-kit/core";

import {
	commonBitWidth,
	fromNumericRanges,
	toNumericRanges,
} from "./_numeric-range.js";
import type { BitAddress } from "./bit-address.js";
import { type BitPrefix, bitPrefixContains } from "./bit-prefix.js";

/**
 * Every address in either collection, as the shortest prefix list.
 *
 * O((n + m) log (n + m)).
 *
 * @throws RangeError When the two collections mix address widths.
 */
export function unionBitPrefixes(
	a: Iterable<BitPrefix>,
	b: Iterable<BitPrefix>,
): BitPrefix[] {
	const list = [...a, ...b];

	if (list.length === 0) {
		return [];
	}

	return fromNumericRanges(toNumericRanges(list), commonBitWidth(list));
}

/**
 * Every address in both collections, as the shortest prefix list.
 *
 * O((n + m) log (n + m)).
 *
 * @throws RangeError When the two collections mix address widths.
 */
export function intersectBitPrefixes(
	a: Iterable<BitPrefix>,
	b: Iterable<BitPrefix>,
): BitPrefix[] {
	const left = Array.from(a);
	const right = Array.from(b);

	if (left.length === 0 || right.length === 0) {
		return [];
	}

	const bitWidth = commonBitWidth([...left, ...right]);

	return fromNumericRanges(
		intersectIntervals(
			toNumericRanges(left),
			toNumericRanges(right),
			compareNaturalAscending,
		),
		bitWidth,
	);
}

/**
 * Every address in `a` but not in `b`, as the shortest prefix list.
 *
 * This is how a firewall carves an exception out of an allowlist, so the result
 * is exact: no address of `b` survives, and none of `a` is lost. O((n + m) log
 * (n + m)).
 *
 * @throws RangeError When the two collections mix address widths.
 */
export function subtractBitPrefixes(
	a: Iterable<BitPrefix>,
	b: Iterable<BitPrefix>,
): BitPrefix[] {
	const left = Array.from(a);
	const right = Array.from(b);

	if (left.length === 0) {
		return [];
	}

	const bitWidth = commonBitWidth(
		right.length === 0 ? left : [...left, ...right],
	);

	return fromNumericRanges(
		subtractIntervals(
			toNumericRanges(left),
			toNumericRanges(right),
			compareNaturalAscending,
			BIG_INT_INTERVAL_STEP,
		),
		bitWidth,
	);
}

/**
 * Whether any prefix in the collection covers `address`.
 *
 * Linear. A routing table queried repeatedly wants a longest-prefix-match
 * structure instead — see this package's `TODO.md`.
 */
export function bitPrefixesContain(
	prefixes: Iterable<BitPrefix>,
	address: BitAddress,
): boolean {
	for (const prefix of prefixes) {
		if (bitPrefixContains(prefix, address)) {
			return true;
		}
	}

	return false;
}

/** Whether every address of `b` is also in `a`. */
export function bitPrefixesContainAll(
	a: Iterable<BitPrefix>,
	b: Iterable<BitPrefix>,
): boolean {
	return subtractBitPrefixes(b, a).length === 0;
}
