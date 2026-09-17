import { expect, suite, test } from "vitest";

import { bitRangeAddressCount } from "../prefix/bit-range.js";
import { compareBitAddresses } from "../prefix/compare.js";
import { classifyIpv4Address, isIpv4SpecialPurpose } from "./classify-ipv4.js";
import {
	ipv4AddressCount,
	ipv4BroadcastAddress,
	ipv4FirstHost,
	ipv4HostCount,
	ipv4LastHost,
	ipv4NetworkAddress,
	ipv4UsableHostRange,
} from "./ipv4-prefix.js";
import {
	parseInetAtonIpv4Address,
	parseIpv4Address,
	parseIpv4Prefix,
	tryParseIpv4Address,
	tryParseIpv4Prefix,
} from "./parse-ipv4.js";
import {
	ipv4FromHex,
	ipv4FromUint32,
	ipv4ReverseName,
	ipv4ToHex,
	ipv4ToUint32,
	printIpv4Address,
	printIpv4Prefix,
} from "./print-ipv4.js";

const print = (text: string) => printIpv4Address(parseIpv4Address(text));

suite("parseIpv4Address", () => {
	test("reads a dotted quad", () => {
		expect(print("192.168.1.1")).toBe("192.168.1.1");
		expect(print("0.0.0.0")).toBe("0.0.0.0");
		expect(print("255.255.255.255")).toBe("255.255.255.255");
	});

	// Python's ipaddress rejects every one of these too.
	test.each([
		"0177.0.0.1",
		"010.0.0.1",
		"0x7f.0.0.1",
		"2130706433",
		"127.1",
		"127.0.0",
		"1.2.3.4.5",
		"256.0.0.1",
		"1.2.3.-4",
		"1.2.3.4 ",
		" 1.2.3.4",
		"1.2.3.04",
		"",
		"...",
	])("rejects %o", (text) => {
		expect(tryParseIpv4Address(text)).toBeNull();
		expect(() => parseIpv4Address(text)).toThrow(SyntaxError);
	});
});

suite("parseInetAtonIpv4Address", () => {
	// The legacy grammar C's inet_aton implements, opted into by name.
	test.each([
		["0177.0.0.1", "127.0.0.1"],
		["2130706433", "127.0.0.1"],
		["0x7f.0.0.1", "127.0.0.1"],
		["127.1", "127.0.0.1"],
		["0x7f000001", "127.0.0.1"],
		["192.168.257", "192.168.1.1"],
	])("reads %o as %o", (text, expected) => {
		expect(printIpv4Address(parseInetAtonIpv4Address(text))).toBe(expected);
	});

	test("still rejects what is not an address at all", () => {
		expect(() => parseInetAtonIpv4Address("1.2.3.4.5")).toThrow(SyntaxError);
		expect(() => parseInetAtonIpv4Address("0x100.0.0.1")).toThrow(SyntaxError);
		expect(() => parseInetAtonIpv4Address("09.0.0.1")).toThrow(SyntaxError);
	});
});

suite("integer and hexadecimal conversion", () => {
	test("round-trips through a 32-bit integer", () => {
		const loopback = parseIpv4Address("127.0.0.1");

		expect(ipv4ToUint32(loopback)).toBe(2_130_706_433);
		expect(printIpv4Address(ipv4FromUint32(2_130_706_433))).toBe("127.0.0.1");
		expect(ipv4ToUint32(parseIpv4Address("255.255.255.255"))).toBe(
			4_294_967_295,
		);
	});

	test("round-trips through hexadecimal", () => {
		expect(ipv4ToHex(parseIpv4Address("127.0.0.1"))).toBe("7f000001");
		expect(printIpv4Address(ipv4FromHex("7f000001"))).toBe("127.0.0.1");
		expect(printIpv4Address(ipv4FromHex("0x7F000001"))).toBe("127.0.0.1");
	});

	test("refuses a value outside 32 bits, or a short hexadecimal run", () => {
		expect(() => ipv4FromUint32(4_294_967_296)).toThrow(RangeError);
		expect(() => ipv4FromUint32(-1)).toThrow(RangeError);
		expect(() => ipv4FromHex("7f01")).toThrow(SyntaxError);
	});
});

suite("IPv4 prefixes", () => {
	// Cross-checked against Python: ip_network("192.168.1.0/24").
	test("reports network, broadcast, host range and counts", () => {
		const network = parseIpv4Prefix("192.168.1.0/24");

		expect(printIpv4Address(ipv4NetworkAddress(network))).toBe("192.168.1.0");
		expect(
			printIpv4Address(ipv4BroadcastAddress(network) ?? network.address),
		).toBe("192.168.1.255");
		expect(printIpv4Address(ipv4FirstHost(network))).toBe("192.168.1.1");
		expect(printIpv4Address(ipv4LastHost(network))).toBe("192.168.1.254");
		expect(ipv4AddressCount(network)).toBe(256);
		expect(ipv4HostCount(network)).toBe(254);
		expect(bitRangeAddressCount(ipv4UsableHostRange(network))).toBe(254n);
	});

	test("gives a /30 two hosts", () => {
		const network = parseIpv4Prefix("172.16.5.0/30");

		expect(printIpv4Address(ipv4FirstHost(network))).toBe("172.16.5.1");
		expect(printIpv4Address(ipv4LastHost(network))).toBe("172.16.5.2");
		expect(ipv4HostCount(network)).toBe(2);
	});

	test("gives a /31 both addresses and no broadcast, per RFC 3021", () => {
		const network = parseIpv4Prefix("10.0.0.0/31");

		expect(ipv4BroadcastAddress(network)).toBeNull();
		expect(printIpv4Address(ipv4FirstHost(network))).toBe("10.0.0.0");
		expect(printIpv4Address(ipv4LastHost(network))).toBe("10.0.0.1");
		expect(ipv4HostCount(network)).toBe(2);
	});

	test("gives a /32 its single address", () => {
		const network = parseIpv4Prefix("10.0.0.5/32");

		expect(ipv4BroadcastAddress(network)).toBeNull();
		expect(printIpv4Address(ipv4FirstHost(network))).toBe("10.0.0.5");
		expect(ipv4HostCount(network)).toBe(1);
	});

	test("keeps host bits in the printed prefix", () => {
		expect(printIpv4Prefix(parseIpv4Prefix("192.168.1.10/24"))).toBe(
			"192.168.1.10/24",
		);
		expect(
			compareBitAddresses(
				ipv4NetworkAddress(parseIpv4Prefix("192.168.1.10/24")),
				parseIpv4Address("192.168.1.0"),
			),
		).toBe(0);
	});

	test.each([
		"10.0.0.0/33",
		"10.0.0.0/",
		"10.0.0.0",
		"0177.0.0.1/8",
		"10.0.0.0/08",
	])("rejects the malformed prefix %o", (text) => {
		expect(tryParseIpv4Prefix(text)).toBeNull();
	});
});

suite("classifyIpv4Address", () => {
	test.each([
		["0.0.0.0", "this-host"],
		["0.1.2.3", "this-host"],
		["127.0.0.1", "loopback"],
		["127.255.255.254", "loopback"],
		["169.254.169.254", "link-local"],
		["10.1.2.3", "private"],
		["172.16.0.1", "private"],
		["172.31.255.255", "private"],
		["172.32.0.1", "global"],
		["192.168.0.1", "private"],
		["100.64.0.1", "shared"],
		["100.127.255.255", "shared"],
		["100.128.0.1", "global"],
		["198.18.0.1", "benchmarking"],
		["192.0.2.1", "documentation"],
		["198.51.100.1", "documentation"],
		["203.0.113.1", "documentation"],
		["224.0.0.1", "multicast"],
		["239.255.255.255", "multicast"],
		["240.0.0.1", "reserved"],
		["255.255.255.255", "limited-broadcast"],
		["8.8.8.8", "global"],
		["1.1.1.1", "global"],
	])("classifies %o as %o", (text, scope) => {
		expect(classifyIpv4Address(parseIpv4Address(text))).toBe(scope);
	});

	test("reports the limited broadcast before the reserved block it sits in", () => {
		expect(classifyIpv4Address(parseIpv4Address("255.255.255.254"))).toBe(
			"reserved",
		);
		expect(classifyIpv4Address(parseIpv4Address("255.255.255.255"))).toBe(
			"limited-broadcast",
		);
	});

	test("flags every special-purpose block for a guard", () => {
		expect(isIpv4SpecialPurpose(parseIpv4Address("169.254.169.254"))).toBe(
			true,
		);
		expect(isIpv4SpecialPurpose(parseIpv4Address("93.184.215.14"))).toBe(false);
	});
});

suite("ipv4ReverseName", () => {
	// Cross-checked against Python: ip_address("127.0.0.1").reverse_pointer.
	test("reverses the octets under in-addr.arpa", () => {
		expect(ipv4ReverseName(parseIpv4Address("127.0.0.1"))).toBe(
			"1.0.0.127.in-addr.arpa",
		);
		expect(ipv4ReverseName(parseIpv4Address("8.8.4.4"))).toBe(
			"4.4.8.8.in-addr.arpa",
		);
	});
});
