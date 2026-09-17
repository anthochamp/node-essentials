import { mergeIntervals } from "@ac-kit/algo";
import { compareNaturalAscending } from "@ac-kit/core";

import { bitAddressFromBigInt, bitAddressToBigInt } from "./bit-address.js";
import type { BitPrefix } from "./bit-prefix.js";
import {
	type BitRange,
	bitRangeFromPrefix,
	bitRangeToPrefixes,
} from "./bit-range.js";

/**
 * Inclusive address ranges as flat, stride-2 `[first, last, first, last, …]`
 * integers — `@ac-kit/algo`'s interval form, so its set algebra applies
 * directly.
 *
 * `BitRange` is the same idea over `BitAddress` and is what callers see; this
 * is the shape the algebra runs on, and the two conversions below are the only
 * boundary between them.
 */
export type NumericRanges = readonly bigint[];

/**
 * The one width every prefix in `prefixes` must share.
 *
 * @throws RangeError When they do not, or when the collection is empty and no
 *   `fallback` was given.
 */
export function commonBitWidth(
	prefixes: readonly BitPrefix[],
	fallback?: number,
): number {
	let width = fallback;

	for (const prefix of prefixes) {
		width ??= prefix.address.bitWidth;

		if (prefix.address.bitWidth !== width) {
			throw new RangeError(
				`prefixes mix ${width}-bit and ${prefix.address.bitWidth}-bit addresses`,
			);
		}
	}

	if (width === undefined) {
		throw new RangeError("cannot infer a bit width from no prefixes");
	}

	return width;
}

/**
 * Sorts and merges touching or adjacent ranges. O(n log n).
 *
 * Addresses are integers, so `10.0.0.5-10.0.0.9` and `10.0.0.10-10.0.0.20` name
 * one contiguous block and have to coalesce — that is what the successor test
 * says, and without it the two would stay apart and produce two prefixes where
 * one covers them.
 */
function normalizeNumericRanges(bounds: NumericRanges): bigint[] {
	return mergeIntervals(
		bounds,
		compareNaturalAscending<bigint>,
		(end, next) => next === end + 1n,
	);
}

/** Converts prefixes to sorted, disjoint, non-touching integer ranges. */
export function toNumericRanges(prefixes: readonly BitPrefix[]): bigint[] {
	const bounds: bigint[] = [];

	for (const prefix of prefixes) {
		const range = bitRangeFromPrefix(prefix);

		bounds.push(
			bitAddressToBigInt(range.first),
			bitAddressToBigInt(range.last),
		);
	}

	return normalizeNumericRanges(bounds);
}

/** Converts integer ranges back to the minimal covering prefix list. */
export function fromNumericRanges(
	ranges: NumericRanges,
	bitWidth: number,
): BitPrefix[] {
	const prefixes: BitPrefix[] = [];

	for (let index = 0; index < ranges.length; index += 2) {
		// Non-null: interval bounds come in pairs.
		const range: BitRange = {
			first: bitAddressFromBigInt(ranges[index]!, bitWidth),
			last: bitAddressFromBigInt(ranges[index + 1]!, bitWidth),
		};

		prefixes.push(...bitRangeToPrefixes(range));
	}

	return prefixes;
}
