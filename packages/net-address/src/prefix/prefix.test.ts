import { expect, suite, test } from "vitest";

import { parseIpv4Address, parseIpv4Prefix } from "../ipv4/parse-ipv4.js";
import { printIpv4Address, printIpv4Prefix } from "../ipv4/print-ipv4.js";
import {
	aggregateBitPrefixes,
	coveringBitPrefix,
	splitBitPrefix,
	splitBitPrefixInto,
} from "./aggregate.js";
import {
	bitAddressCommonPrefixLength,
	bitAddressFromBigInt,
	bitAddressFromBytes,
	bitAddressToBigInt,
} from "./bit-address.js";
import {
	BitPrefix,
	bitPrefixAddressCount,
	bitPrefixContains,
	bitPrefixContainsPrefix,
	bitPrefixIsSubnetOf,
	bitPrefixIsSupernetOf,
	bitPrefixOverlaps,
	bitPrefixSibling,
	bitPrefixSupernet,
} from "./bit-prefix.js";
import {
	bitRangeAddressCount,
	bitRangeToPrefixes,
	createBitRange,
} from "./bit-range.js";
import { compareBitAddresses, sortBitAddresses } from "./compare.js";
import {
	isContiguousMask,
	maskFromPrefixLength,
	prefixLengthFromMask,
	wildcardMaskFromPrefixLength,
} from "./mask.js";
import {
	intersectBitPrefixes,
	subtractBitPrefixes,
	unionBitPrefixes,
} from "./set-ops.js";

const address = (text: string) => parseIpv4Address(text);
const prefix = (text: string) => parseIpv4Prefix(text);
const printPrefixes = (prefixes: readonly BitPrefix[]) =>
	prefixes.map(printIpv4Prefix);
const printOptionalPrefix = (value: BitPrefix | null) =>
	value === null ? null : printIpv4Prefix(value);

suite("BitAddress", () => {
	test("carries its width rather than deriving one from the value", () => {
		const low = address("0.0.0.1");

		expect(low.bitWidth).toBe(32);
		expect(bitAddressToBigInt(low)).toBe(1n);
	});

	test("reads the whole width as unsigned, top bit and all", () => {
		// The exact case a two's-complement decoder gets wrong: `bigIntFromBytesBe`
		// answers -1n here, and every classification and range calculation built on
		// that would be off by 2^32.
		expect(bitAddressToBigInt(address("255.255.255.255"))).toBe(4_294_967_295n);
		expect(bitAddressToBigInt(address("128.0.0.0"))).toBe(2_147_483_648n);
		expect(printIpv4Address(bitAddressFromBigInt(4_294_967_295n, 32))).toBe(
			"255.255.255.255",
		);
		expect(() => bitAddressFromBigInt(-1n, 32)).toThrow(RangeError);
	});

	test("rejects octets that do not match the declared width", () => {
		expect(() => bitAddressFromBytes(new Uint8Array(4), 128)).toThrow(
			RangeError,
		);
		expect(() => bitAddressFromBytes(new Uint8Array(4), 33)).toThrow(
			RangeError,
		);
	});

	test("does not alias the octets it is given", () => {
		const octets = new Uint8Array([10, 0, 0, 1]);
		const read = bitAddressFromBytes(octets, 32);
		octets[0] = 192;

		expect(printIpv4Address(read)).toBe("10.0.0.1");
	});

	test("counts the bits two addresses share", () => {
		expect(
			bitAddressCommonPrefixLength(address("10.0.0.0"), address("10.0.1.0")),
		).toBe(23);
		expect(
			bitAddressCommonPrefixLength(address("10.0.0.1"), address("10.0.0.1")),
		).toBe(32);
		expect(
			bitAddressCommonPrefixLength(address("0.0.0.0"), address("128.0.0.0")),
		).toBe(0);
	});
});

suite("compareBitAddresses", () => {
	test("orders exactly, and agrees with equality", () => {
		expect(compareBitAddresses(address("10.0.0.1"), address("10.0.0.2"))).toBe(
			-1,
		);
		expect(compareBitAddresses(address("10.0.0.2"), address("10.0.0.1"))).toBe(
			1,
		);
		expect(compareBitAddresses(address("10.0.0.1"), address("10.0.0.1"))).toBe(
			0,
		);
	});

	test("sorts numerically, not lexicographically", () => {
		const sorted = sortBitAddresses([
			address("10.0.0.100"),
			address("10.0.0.9"),
			address("10.0.0.20"),
		]).map(printIpv4Address);

		expect(sorted).toEqual(["10.0.0.9", "10.0.0.20", "10.0.0.100"]);
	});

	test("orders a narrower width first, so mixed collections still sort", () => {
		const narrow = bitAddressFromBigInt(0n, 32);
		const wide = bitAddressFromBigInt(0n, 128);

		expect(compareBitAddresses(narrow, wide)).toBe(-1);
	});

	test("orders by width before value, whatever the leading octet holds", () => {
		const narrow = address("255.255.255.255");
		const wide = bitAddressFromBigInt(0n, 128);

		expect(compareBitAddresses(narrow, wide)).toBe(-1);
		expect(compareBitAddresses(wide, narrow)).toBe(1);
	});
});

suite("masks", () => {
	// Cross-checked against Python: ip_network("10.0.0.0/20").netmask/.hostmask.
	test("converts a prefix length to a netmask and back", () => {
		expect(printIpv4Address(maskFromPrefixLength(20, 32))).toBe(
			"255.255.240.0",
		);
		expect(printIpv4Address(wildcardMaskFromPrefixLength(20, 32))).toBe(
			"0.0.15.255",
		);
		expect(prefixLengthFromMask(address("255.255.240.0"))).toBe(20);
		expect(prefixLengthFromMask(address("0.0.0.0"))).toBe(0);
		expect(prefixLengthFromMask(address("255.255.255.255"))).toBe(32);
	});

	test("refuses a mask that names no prefix length", () => {
		expect(isContiguousMask(address("255.0.255.0"))).toBe(false);
		expect(() => prefixLengthFromMask(address("255.0.255.0"))).toThrow(
			RangeError,
		);
	});
});

suite("BitPrefix", () => {
	test("keeps host bits but compares on the network", () => {
		const host = prefix("192.168.1.10/24");

		expect(printIpv4Prefix(host)).toBe("192.168.1.10/24");
		expect(bitPrefixContains(host, address("192.168.1.200"))).toBe(true);
		expect(bitPrefixContains(host, address("192.168.2.1"))).toBe(false);
	});

	test("counts addresses as a bigint", () => {
		expect(bitPrefixAddressCount(prefix("192.168.1.0/24"))).toBe(256n);
		expect(bitPrefixAddressCount(prefix("0.0.0.0/0"))).toBe(4_294_967_296n);
	});

	test("nests and overlaps", () => {
		const outer = prefix("10.0.0.0/8");
		const inner = prefix("10.1.0.0/16");
		const other = prefix("11.0.0.0/8");

		expect(bitPrefixContainsPrefix(outer, inner)).toBe(true);
		expect(bitPrefixContainsPrefix(inner, outer)).toBe(false);
		expect(bitPrefixIsSubnetOf(inner, outer)).toBe(true);
		expect(bitPrefixIsSupernetOf(outer, inner)).toBe(true);
		expect(bitPrefixOverlaps(outer, inner)).toBe(true);
		expect(bitPrefixOverlaps(outer, other)).toBe(false);
	});

	test("finds its supernet and its sibling", () => {
		// Cross-checked against Python: ip_network("10.0.0.0/24").supernet().
		expect(printOptionalPrefix(bitPrefixSupernet(prefix("10.0.0.0/24")))).toBe(
			"10.0.0.0/23",
		);
		expect(printOptionalPrefix(bitPrefixSibling(prefix("10.0.0.0/24")))).toBe(
			"10.0.1.0/24",
		);
		expect(printOptionalPrefix(bitPrefixSibling(prefix("10.0.1.0/24")))).toBe(
			"10.0.0.0/24",
		);
		expect(bitPrefixSupernet(prefix("0.0.0.0/0"))).toBeNull();
		expect(bitPrefixSibling(prefix("0.0.0.0/0"))).toBeNull();
	});
});

suite("bitRangeToPrefixes", () => {
	// Cross-checked against Python's ipaddress.summarize_address_range.
	test("decomposes an arbitrary range into the minimal CIDR set", () => {
		const range = createBitRange(address("10.0.0.5"), address("10.0.0.9"));

		expect(printPrefixes(bitRangeToPrefixes(range))).toEqual([
			"10.0.0.5/32",
			"10.0.0.6/31",
			"10.0.0.8/31",
		]);
	});

	test("decomposes a range crossing a power-of-two boundary", () => {
		const range = createBitRange(address("192.0.2.0"), address("192.0.2.130"));

		expect(printPrefixes(bitRangeToPrefixes(range))).toEqual([
			"192.0.2.0/25",
			"192.0.2.128/31",
			"192.0.2.130/32",
		]);
	});

	test("covers the whole space as a single /0", () => {
		const range = createBitRange(
			address("0.0.0.0"),
			address("255.255.255.255"),
		);

		expect(printPrefixes(bitRangeToPrefixes(range))).toEqual(["0.0.0.0/0"]);
		expect(bitRangeAddressCount(range)).toBe(4_294_967_296n);
	});

	test("refuses a range whose end precedes its start", () => {
		expect(() =>
			createBitRange(address("10.0.0.9"), address("10.0.0.5")),
		).toThrow(RangeError);
	});
});

suite("aggregateBitPrefixes", () => {
	// Cross-checked against Python's ipaddress.collapse_addresses.
	test("merges two adjacent halves into their supernet", () => {
		const merged = aggregateBitPrefixes([
			prefix("10.0.0.0/25"),
			prefix("10.0.0.128/25"),
		]);

		expect(printPrefixes(merged)).toEqual(["10.0.0.0/24"]);
	});

	test("leaves a non-adjacent block alone", () => {
		const merged = aggregateBitPrefixes([
			prefix("10.0.0.0/24"),
			prefix("10.0.1.0/24"),
			prefix("10.0.3.0/24"),
		]);

		expect(printPrefixes(merged)).toEqual(["10.0.0.0/23", "10.0.3.0/24"]);
	});

	test("absorbs a subnet into its supernet", () => {
		const merged = aggregateBitPrefixes([
			prefix("10.0.0.0/8"),
			prefix("10.1.2.0/24"),
		]);

		expect(printPrefixes(merged)).toEqual(["10.0.0.0/8"]);
	});

	test("normalizes host bits away", () => {
		expect(
			printPrefixes(aggregateBitPrefixes([prefix("10.1.2.3/24")])),
		).toEqual(["10.1.2.0/24"]);
	});

	test("refuses to mix address families", () => {
		const wide = {
			address: bitAddressFromBigInt(0n, 128),
			prefixLength: 64,
		};

		expect(() => aggregateBitPrefixes([prefix("10.0.0.0/8"), wide])).toThrow(
			RangeError,
		);
	});
});

suite("splitBitPrefix", () => {
	// Cross-checked against Python: ip_network("10.0.0.0/24").subnets(new_prefix=26).
	test("divides into equal subnets", () => {
		expect(printPrefixes(splitBitPrefix(prefix("10.0.0.0/24"), 26))).toEqual([
			"10.0.0.0/26",
			"10.0.0.64/26",
			"10.0.0.128/26",
			"10.0.0.192/26",
		]);
	});

	test("rounds a requested count up to the next power of two", () => {
		expect(printPrefixes(splitBitPrefixInto(prefix("10.0.0.0/24"), 3))).toEqual(
			["10.0.0.0/26", "10.0.0.64/26", "10.0.0.128/26", "10.0.0.192/26"],
		);
	});

	test("refuses a length outside the prefix", () => {
		expect(() => splitBitPrefix(prefix("10.0.0.0/24"), 23)).toThrow(RangeError);
		expect(() => splitBitPrefix(prefix("10.0.0.0/24"), 33)).toThrow(RangeError);
	});
});

suite("set operations", () => {
	test("unions and merges", () => {
		const union = unionBitPrefixes(
			[prefix("10.0.0.0/25")],
			[prefix("10.0.0.128/25")],
		);

		expect(printPrefixes(union)).toEqual(["10.0.0.0/24"]);
	});

	test("intersects down to the narrower block", () => {
		const both = intersectBitPrefixes(
			[prefix("10.0.0.0/8")],
			[prefix("10.1.0.0/16"), prefix("11.0.0.0/8")],
		);

		expect(printPrefixes(both)).toEqual(["10.1.0.0/16"]);
	});

	test("subtracts a hole, matching address_exclude", () => {
		const remainder = subtractBitPrefixes(
			[prefix("10.0.0.0/24")],
			[prefix("10.0.0.64/26")],
		);

		expect(printPrefixes(remainder)).toEqual(["10.0.0.0/26", "10.0.0.128/25"]);
	});

	test("subtracting everything leaves nothing", () => {
		expect(
			subtractBitPrefixes([prefix("10.0.0.0/24")], [prefix("10.0.0.0/8")]),
		).toEqual([]);
	});
});

suite("coveringBitPrefix", () => {
	test("finds the smallest prefix covering every input", () => {
		const covering = coveringBitPrefix([
			prefix("10.0.0.0/24"),
			prefix("10.0.3.0/24"),
		]);

		expect(printIpv4Prefix(covering)).toBe("10.0.0.0/22");
	});

	test("is the prefix itself for a single input", () => {
		expect(printIpv4Prefix(coveringBitPrefix([prefix("10.1.2.3/24")]))).toBe(
			"10.1.2.0/24",
		);
	});
});
