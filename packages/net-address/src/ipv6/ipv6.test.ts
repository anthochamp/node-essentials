import { expect, suite, test } from "vitest";

import { parseIpv4Address, parseIpv4Prefix } from "../ipv4/parse-ipv4.js";
import { printIpv4Address } from "../ipv4/print-ipv4.js";
import { bitAddressToBigInt } from "../prefix/bit-address.js";
import {
	classifyIpv6Address,
	ipv6MulticastScope,
	isIpv6TransientMulticast,
} from "./classify-ipv6.js";
import {
	ipv4FromIpv6,
	ipv6FromIpv4,
	ipv6PrefixFromIpv4Prefix,
	isIpv6Ipv4Compatible,
	isIpv6Ipv4Mapped,
} from "./ipv4-mapped.js";
import {
	ipv6AddressCount,
	ipv6LastAddress,
	ipv6NetworkAddress,
	ipv6SubnetRouterAnycastAddress,
} from "./ipv6-prefix.js";
import {
	parseIpv6Address,
	parseIpv6Prefix,
	parseIpv6ScopedAddress,
	tryParseIpv6Address,
} from "./parse-ipv6.js";
import {
	ipv6ReverseName,
	printIpv6Address,
	printIpv6Prefix,
	printIpv6ScopedAddress,
} from "./print-ipv6.js";

const canonical = (text: string) => printIpv6Address(parseIpv6Address(text));

suite("parseIpv6Address", () => {
	test("reads the three RFC 4291 §2.2 forms", () => {
		expect(canonical("2001:db8:0:0:8:800:200c:417a")).toBe(
			"2001:db8::8:800:200c:417a",
		);
		expect(canonical("2001:db8::8:800:200c:417a")).toBe(
			"2001:db8::8:800:200c:417a",
		);
		expect(canonical("::ffff:129.144.52.38")).toBe("::ffff:129.144.52.38");
	});

	test("reads `::` standing for one or more zero groups", () => {
		expect(canonical("::")).toBe("::");
		expect(canonical("::1")).toBe("::1");
		expect(canonical("1::")).toBe("1::");
		// Python reads this as 1:2:3:4:5:6:7:0 — `::` covers exactly one group.
		expect(canonical("1:2:3:4:5:6:7::")).toBe("1:2:3:4:5:6:7:0");
	});

	// Python's ipaddress rejects every one of these too.
	test.each([
		"1:2:3:4:5:6:7:8:9",
		"1:2:3:4:5:6:7",
		":1::",
		"1::2::3",
		"2001:db8::1:",
		"::00001",
		"::ffff:0177.0.0.1",
		"::ffff:256.0.0.1",
		"12345::",
		"",
		":",
		"fe80::1%eth0",
	])("rejects %o", (text) => {
		expect(tryParseIpv6Address(text)).toBeNull();
	});

	test("carries the numeric value exactly", () => {
		// Cross-checked against Python: int(ip_address("2001:db8::1")).
		expect(bitAddressToBigInt(parseIpv6Address("2001:db8::1"))).toBe(
			42_540_766_411_282_592_856_903_984_951_653_826_561n,
		);
	});
});

suite("printIpv6Address — RFC 5952 §4", () => {
	// The vectors are quoted from RFC 5952 section 4, one per sub-section.
	test("§4.1 suppresses leading zeros in a group", () => {
		expect(canonical("2001:0db8::0001")).toBe("2001:db8::1");
	});

	test("§4.2.1 compresses a run of zero groups", () => {
		expect(canonical("2001:db8:0:0:0:0:2:1")).toBe("2001:db8::2:1");
	});

	test("§4.2.2 never compresses a single zero group", () => {
		expect(canonical("2001:db8:0:1:1:1:1:1")).toBe("2001:db8:0:1:1:1:1:1");
	});

	test("§4.2.3 compresses the longest run", () => {
		expect(canonical("2001:0:0:1:0:0:0:1")).toBe("2001:0:0:1::1");
	});

	test("§4.2.3 compresses the leftmost run on a tie", () => {
		expect(canonical("2001:db8:0:0:1:0:0:1")).toBe("2001:db8::1:0:0:1");
	});

	test("§4.3 prints lowercase hexadecimal", () => {
		expect(canonical("2001:DB8::A:B:C:D")).toBe("2001:db8::a:b:c:d");
	});

	test("§5 prints an IPv4-mapped address in dotted form, and nothing else", () => {
		expect(canonical("::ffff:192.0.2.1")).toBe("::ffff:192.0.2.1");
		// Python prints the deprecated IPv4-compatible form as hexadecimal.
		expect(canonical("::0.0.0.1")).toBe("::1");
		expect(canonical("::ffff:0:255.255.255.255")).toBe("::ffff:0:ffff:ffff");
	});
});

suite("zone identifiers", () => {
	test("round-trips an RFC 4007 zone", () => {
		const scoped = parseIpv6ScopedAddress("fe80::1%eth0");

		expect(scoped.zoneId).toBe("eth0");
		expect(printIpv6ScopedAddress(scoped)).toBe("fe80::1%eth0");
	});

	test("takes the zone verbatim, leaving %25 to the URI layer", () => {
		expect(parseIpv6ScopedAddress("fe80::1%25eth0").zoneId).toBe("25eth0");
	});

	test("answers null for an address that carries none", () => {
		expect(parseIpv6ScopedAddress("::1").zoneId).toBeNull();
	});

	test("rejects an empty zone", () => {
		expect(() => parseIpv6ScopedAddress("fe80::1%")).toThrow(SyntaxError);
	});
});

suite("IPv4-mapped addresses", () => {
	test("widens and narrows", () => {
		const mapped = ipv6FromIpv4(parseIpv4Address("192.0.2.1"));

		expect(printIpv6Address(mapped)).toBe("::ffff:192.0.2.1");
		expect(isIpv6Ipv4Mapped(mapped)).toBe(true);
		expect(printIpv4Address(ipv4FromIpv6(mapped) ?? mapped)).toBe("192.0.2.1");
	});

	test("tells the mapped form from the deprecated compatible one", () => {
		expect(isIpv6Ipv4Mapped(parseIpv6Address("::192.0.2.1"))).toBe(false);
		expect(isIpv6Ipv4Compatible(parseIpv6Address("::192.0.2.1"))).toBe(true);
		expect(isIpv6Ipv4Compatible(parseIpv6Address("::1"))).toBe(false);
		expect(isIpv6Ipv4Compatible(parseIpv6Address("::"))).toBe(false);
	});

	test("widens a prefix by the 96-bit offset", () => {
		expect(
			printIpv6Prefix(ipv6PrefixFromIpv4Prefix(parseIpv4Prefix("10.0.0.0/8"))),
		).toBe("::ffff:10.0.0.0/104");
	});

	test("answers null when nothing is embedded", () => {
		expect(ipv4FromIpv6(parseIpv6Address("2001:db8::1"))).toBeNull();
	});
});

suite("IPv6 prefixes", () => {
	// Cross-checked against Python: ip_network("2001:db8::/32").
	test("counts addresses as a bigint, because a double cannot", () => {
		const network = parseIpv6Prefix("2001:db8::/32");

		expect(ipv6AddressCount(network)).toBe(
			79_228_162_514_264_337_593_543_950_336n,
		);
		expect(printIpv6Address(ipv6NetworkAddress(network))).toBe("2001:db8::");
		expect(printIpv6Address(ipv6LastAddress(network))).toBe(
			"2001:db8:ffff:ffff:ffff:ffff:ffff:ffff",
		);
	});

	test("names the Subnet-Router anycast address", () => {
		expect(
			printIpv6Address(
				ipv6SubnetRouterAnycastAddress(parseIpv6Prefix("2001:db8:abcd::/64")),
			),
		).toBe("2001:db8:abcd::");
	});

	test("bounds fe80::/10 where RFC 4291 does", () => {
		const network = parseIpv6Prefix("fe80::/10");

		expect(printIpv6Address(ipv6LastAddress(network))).toBe(
			"febf:ffff:ffff:ffff:ffff:ffff:ffff:ffff",
		);
	});
});

suite("classifyIpv6Address", () => {
	test.each([
		["::", "unspecified"],
		["::1", "loopback"],
		["::ffff:127.0.0.1", "ipv4-mapped"],
		["::192.0.2.1", "ipv4-compatible"],
		["fe80::1", "link-local"],
		["febf::1", "link-local"],
		["fec0::1", "global"],
		["fc00::1", "unique-local"],
		["fd12:3456::1", "unique-local"],
		["ff02::1", "multicast"],
		["2001:db8::1", "documentation"],
		["2001::1", "teredo"],
		["2002::1", "6to4"],
		["2606:4700::1", "global"],
	])("classifies %o as %o", (text, scope) => {
		expect(classifyIpv6Address(parseIpv6Address(text))).toBe(scope);
	});

	test("reads the multicast scope nibble", () => {
		expect(ipv6MulticastScope(parseIpv6Address("ff01::1"))).toBe(
			"interface-local",
		);
		expect(ipv6MulticastScope(parseIpv6Address("ff02::1"))).toBe("link-local");
		expect(ipv6MulticastScope(parseIpv6Address("ff05::1"))).toBe("site-local");
		expect(ipv6MulticastScope(parseIpv6Address("ff0e::1"))).toBe("global");
		expect(ipv6MulticastScope(parseIpv6Address("2001:db8::1"))).toBeNull();
	});

	test("reads the multicast transient flag", () => {
		expect(isIpv6TransientMulticast(parseIpv6Address("ff02::1"))).toBe(false);
		expect(isIpv6TransientMulticast(parseIpv6Address("ff12::1"))).toBe(true);
		expect(isIpv6TransientMulticast(parseIpv6Address("::1"))).toBeNull();
	});
});

suite("ipv6ReverseName", () => {
	// Cross-checked against Python: ip_address(...).reverse_pointer.
	test("writes the nibbles in reverse under ip6.arpa", () => {
		expect(ipv6ReverseName(parseIpv6Address("2001:db8::1"))).toBe(
			"1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa",
		);
		expect(ipv6ReverseName(parseIpv6Address("fe80::200:5eff:fe00:5213"))).toBe(
			"3.1.2.5.0.0.e.f.f.f.e.5.0.0.2.0.0.0.0.0.0.0.0.0.0.0.0.0.0.8.e.f.ip6.arpa",
		);
	});
});
