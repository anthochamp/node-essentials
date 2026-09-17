import {
	commonBitWidth,
	fromNumericRanges,
	toNumericRanges,
} from "./_numeric-range.js";
import {
	bitAddressCommonPrefixLength,
	bitAddressFromBigInt,
	bitAddressToBigInt,
} from "./bit-address.js";
import {
	type BitPrefix,
	bitPrefixFirstAddress,
	normalizeBitPrefix,
} from "./bit-prefix.js";

/**
 * Summarises a collection into the shortest equivalent prefix list: overlaps
 * absorbed, adjacent siblings merged, everything sorted.
 *
 * `10.0.0.0/25` and `10.0.0.128/25` come back as `10.0.0.0/24`. O(n log n) in
 * the number of prefixes, plus at most `2 * bitWidth` prefixes per resulting
 * run.
 *
 * @throws RangeError When the prefixes are not all the same width.
 */
export function aggregateBitPrefixes(
	prefixes: Iterable<BitPrefix>,
): BitPrefix[] {
	const list = Array.from(prefixes);

	if (list.length === 0) {
		return [];
	}

	const bitWidth = commonBitWidth(list);

	return fromNumericRanges(toNumericRanges(list), bitWidth);
}

/**
 * Divides a prefix into every subnet of `subnetPrefixLength`.
 *
 * Allocates `2 ** (subnetPrefixLength - prefix.prefixLength)` entries, so the
 * cost is exponential in the difference and the caller chooses it.
 *
 * @throws RangeError When `subnetPrefixLength` is not between the prefix's own
 *   length and its bit width, or when the subnet count exceeds what an array
 *   can hold.
 */
export function splitBitPrefix(
	prefix: BitPrefix,
	subnetPrefixLength: number,
): BitPrefix[] {
	const { bitWidth } = prefix.address;

	if (
		!Number.isInteger(subnetPrefixLength) ||
		subnetPrefixLength < prefix.prefixLength ||
		subnetPrefixLength > bitWidth
	) {
		throw new RangeError(
			`subnet prefix length must be an integer in [${prefix.prefixLength}, ${bitWidth}], got ${subnetPrefixLength}`,
		);
	}

	const count = 1n << BigInt(subnetPrefixLength - prefix.prefixLength);

	if (count > BigInt(Number.MAX_SAFE_INTEGER)) {
		throw new RangeError(
			`splitting /${prefix.prefixLength} into /${subnetPrefixLength} yields ${count} subnets`,
		);
	}

	const step = 1n << BigInt(bitWidth - subnetPrefixLength);
	const start = bitAddressToBigInt(bitPrefixFirstAddress(prefix));
	const subnets: BitPrefix[] = [];

	for (let index = 0n; index < count; index++) {
		subnets.push({
			address: bitAddressFromBigInt(start + index * step, bitWidth),
			prefixLength: subnetPrefixLength,
		});
	}

	return subnets;
}

/**
 * Divides a prefix into at least `subnetCount` equal subnets.
 *
 * Subnets only come in powers of two, so asking for 3 gives 4. The extra blocks
 * are returned rather than dropped: a caller splitting for allocation needs to
 * know they exist.
 *
 * @throws RangeError When `subnetCount` is not a positive integer, or when the
 *   prefix cannot be divided that far.
 */
export function splitBitPrefixInto(
	prefix: BitPrefix,
	subnetCount: number,
): BitPrefix[] {
	if (!Number.isInteger(subnetCount) || subnetCount < 1) {
		throw new RangeError(
			`subnet count must be a positive integer, got ${subnetCount}`,
		);
	}

	const extraBits = Math.ceil(Math.log2(subnetCount));

	return splitBitPrefix(prefix, prefix.prefixLength + extraBits);
}

/**
 * The smallest single prefix covering every input.
 *
 * Unlike {@link aggregateBitPrefixes} this may cover addresses none of the
 * inputs did — that is what makes it a supernet rather than a summary. O(n) in
 * the number of prefixes.
 *
 * @throws RangeError When the collection is empty or mixes widths.
 */
export function coveringBitPrefix(prefixes: Iterable<BitPrefix>): BitPrefix {
	const list = Array.from(prefixes);
	const bitWidth = commonBitWidth(list);
	const ranges = toNumericRanges(list);
	// `toNumericRanges` sorts, so the extremes sit at the two ends.
	const lowest = ranges[0];
	const highest = ranges.at(-1);

	if (lowest === undefined || highest === undefined) {
		throw new RangeError("cannot cover an empty collection of prefixes");
	}

	const first = bitAddressFromBigInt(lowest, bitWidth);
	const last = bitAddressFromBigInt(highest, bitWidth);

	return normalizeBitPrefix({
		address: first,
		prefixLength: bitAddressCommonPrefixLength(first, last),
	});
}
