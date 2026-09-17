import { expect, suite, test } from "vitest";

import { printIpv6Address } from "../ipv6/print-ipv6.js";
import { bitPrefixContains } from "../prefix/bit-prefix.js";
import {
	EUI48_BROADCAST_ADDRESS,
	EUI48_NULL_ADDRESS,
	EUI_ASSIGNMENT_BLOCK_BIT_LENGTHS,
	euiAssignmentPrefix,
	euiCid,
	euiOui,
	euiOuiPrefix,
	isEuiBroadcast,
	isEuiCid,
	isEuiGroup,
	isEuiIndividual,
	isEuiLocal,
	isEuiNull,
	isEuiUniversal,
} from "./eui-bits.js";
import {
	eui48ToEui64,
	eui64ToEui48,
	isEui64FromEui48,
	tryEui64ToEui48,
} from "./eui-convert.js";
import {
	euiToIpv6InterfaceIdentifier,
	ipv6InterfaceIdentifierToEui64,
} from "./interface-identifier.js";
import { parseEui, parseEui48, parseEui64, tryParseEui } from "./parse-eui.js";
import {
	EUI_PRINT_IEEE,
	EUI_PRINT_IETF,
	printEui,
	printEuiOui,
} from "./print-eui.js";

const bare = (text: string) =>
	printEui(parseEui(text), { notation: "bare", letterCase: "lower" });

suite("parseEui", () => {
	test.each([
		"00:1a:2b:3c:4d:5e",
		"00-1A-2B-3C-4D-5E",
		"001a.2b3c.4d5e",
		"001A2B3C4D5E",
	])("reads %o as the same EUI-48", (text) => {
		expect(bare(text)).toBe("001a2b3c4d5e");
		expect(parseEui(text).bitWidth).toBe(48);
	});

	test("reads an EUI-64 in every notation", () => {
		expect(bare("00:1a:2b:ff:fe:3c:4d:5e")).toBe("001a2bfffe3c4d5e");
		expect(bare("00-1A-2B-FF-FE-3C-4D-5E")).toBe("001a2bfffe3c4d5e");
		expect(bare("001a.2bff.fe3c.4d5e")).toBe("001a2bfffe3c4d5e");
		expect(parseEui("001a2bfffe3c4d5e").bitWidth).toBe(64);
	});

	test.each([
		"00:1a-2b:3c:4d:5e",
		"00:1a:2b:3c:4d",
		"001a2b",
		"001a2b3c4d5",
		"00:1a:2b:3c:4d:5g",
		"",
		"001a.2b3c.4d5e.",
	])("rejects %o", (text) => {
		expect(tryParseEui(text)).toBeNull();
		expect(() => parseEui(text)).toThrow(SyntaxError);
	});

	test("refuses a width the caller did not ask for", () => {
		expect(() => parseEui48("001a2bfffe3c4d5e")).toThrow(SyntaxError);
		expect(() => parseEui64("001a2b3c4d5e")).toThrow(SyntaxError);
	});
});

suite("printEui", () => {
	const address = parseEui48("001a2b3c4d5e");

	test("spells every notation in the requested case", () => {
		expect(printEui(address, { notation: "colon", letterCase: "lower" })).toBe(
			"00:1a:2b:3c:4d:5e",
		);
		expect(printEui(address, { notation: "hyphen", letterCase: "upper" })).toBe(
			"00-1A-2B-3C-4D-5E",
		);
		expect(printEui(address, { notation: "dot", letterCase: "lower" })).toBe(
			"001a.2b3c.4d5e",
		);
		expect(printEui(address, { notation: "bare", letterCase: "upper" })).toBe(
			"001A2B3C4D5E",
		);
	});

	test("carries the two standard spellings as named options", () => {
		expect(printEui(address, EUI_PRINT_IEEE)).toBe("00-1A-2B-3C-4D-5E");
		expect(printEui(address, EUI_PRINT_IETF)).toBe("00:1a:2b:3c:4d:5e");
	});

	test("prints the OUI, falling back to hyphens for the dotted notation", () => {
		expect(printEuiOui(address, EUI_PRINT_IEEE)).toBe("00-1A-2B");
		expect(printEuiOui(address, { notation: "dot", letterCase: "lower" })).toBe(
			"00-1a-2b",
		);
	});
});

suite("the I/G and U/L bits", () => {
	test("reads the I/G bit as group versus individual", () => {
		expect(isEuiGroup(parseEui48("01:00:5e:00:00:01"))).toBe(true);
		expect(isEuiIndividual(parseEui48("01:00:5e:00:00:01"))).toBe(false);
		expect(isEuiGroup(parseEui48("00:1a:2b:3c:4d:5e"))).toBe(false);
		expect(isEuiIndividual(parseEui48("00:1a:2b:3c:4d:5e"))).toBe(true);
	});

	test("reads the U/L bit as local versus universal", () => {
		expect(isEuiLocal(parseEui48("02:1a:2b:3c:4d:5e"))).toBe(true);
		expect(isEuiUniversal(parseEui48("02:1a:2b:3c:4d:5e"))).toBe(false);
		expect(isEuiLocal(parseEui48("00:1a:2b:3c:4d:5e"))).toBe(false);
		expect(isEuiUniversal(parseEui48("00:1a:2b:3c:4d:5e"))).toBe(true);
	});

	test("names the broadcast and null addresses", () => {
		expect(isEuiBroadcast(EUI48_BROADCAST_ADDRESS)).toBe(true);
		expect(isEuiNull(EUI48_NULL_ADDRESS)).toBe(true);
		expect(isEuiBroadcast(EUI48_NULL_ADDRESS)).toBe(false);
		// The broadcast address is a group address with the local bit set.
		expect(isEuiGroup(EUI48_BROADCAST_ADDRESS)).toBe(true);
		expect(isEuiLocal(EUI48_BROADCAST_ADDRESS)).toBe(true);
	});
});

suite("OUI, CID and assignment blocks", () => {
	test("extracts the 24-bit OUI", () => {
		expect(euiOui(parseEui48("00:1a:2b:3c:4d:5e"))).toBe(0x00_1a_2b);
		expect(euiOui(parseEui64("00:1a:2b:ff:fe:3c:4d:5e"))).toBe(0x00_1a_2b);
	});

	test("reads a CID only on a locally administered individual address", () => {
		expect(isEuiCid(parseEui48("02:1a:2b:3c:4d:5e"))).toBe(true);
		expect(euiCid(parseEui48("02:1a:2b:3c:4d:5e"))).toBe(0x02_1a_2b);
		expect(isEuiCid(parseEui48("00:1a:2b:3c:4d:5e"))).toBe(false);
		expect(euiCid(parseEui48("00:1a:2b:3c:4d:5e"))).toBeNull();
		expect(isEuiCid(parseEui48("03:1a:2b:3c:4d:5e"))).toBe(false);
	});

	test("uses the OUI prefix to test another address for the same vendor", () => {
		const vendor = euiOuiPrefix(parseEui48("00:1a:2b:00:00:01"));

		expect(vendor.prefixLength).toBe(24);
		expect(bitPrefixContains(vendor, parseEui48("00:1a:2b:ff:ff:ff"))).toBe(
			true,
		);
		expect(bitPrefixContains(vendor, parseEui48("00:1a:2c:00:00:01"))).toBe(
			false,
		);
	});

	test("sizes MA-L, MA-M and MA-S at 24, 28 and 36 bits", () => {
		expect(EUI_ASSIGNMENT_BLOCK_BIT_LENGTHS).toEqual({
			"ma-l": 24,
			"ma-m": 28,
			"ma-s": 36,
		});

		const address = parseEui48("00:1a:2b:3c:4d:5e");

		expect(euiAssignmentPrefix(address, "ma-l").prefixLength).toBe(24);
		expect(euiAssignmentPrefix(address, "ma-m").prefixLength).toBe(28);
		expect(euiAssignmentPrefix(address, "ma-s").prefixLength).toBe(36);
	});
});

suite("EUI-48 and EUI-64 conversion", () => {
	test("inserts and removes FF:FE", () => {
		const widened = eui48ToEui64(parseEui48("00-1A-2B-3C-4D-5E"));

		expect(printEui(widened, EUI_PRINT_IEEE)).toBe("00-1A-2B-FF-FE-3C-4D-5E");
		expect(isEui64FromEui48(widened)).toBe(true);
		expect(printEui(eui64ToEui48(widened), EUI_PRINT_IEEE)).toBe(
			"00-1A-2B-3C-4D-5E",
		);
	});

	test("leaves the U/L bit alone — that step belongs to the IPv6 identifier", () => {
		expect(isEuiUniversal(eui48ToEui64(parseEui48("34-56-78-9A-BC-DE")))).toBe(
			true,
		);
	});

	test("refuses to narrow a native EUI-64", () => {
		const native = parseEui64("00-1A-2B-3C-4D-5E-6F-70");

		expect(isEui64FromEui48(native)).toBe(false);
		expect(tryEui64ToEui48(native)).toBeNull();
		expect(() => eui64ToEui48(native)).toThrow(RangeError);
	});
});

suite("euiToIpv6InterfaceIdentifier — RFC 4291 Appendix A", () => {
	// The Appendix A worked example: a universally administered EUI-64
	// 34-56-78-9A-BC-DE-F0-12 becomes 36-56-78-9A-BC-DE-F0-12, because the
	// identifier spells "universal" as a one and IEEE 802 spells it as a zero.
	test("complements the U/L bit of an EUI-64", () => {
		const identifier = euiToIpv6InterfaceIdentifier(
			parseEui64("34-56-78-9A-BC-DE-F0-12"),
		);

		expect(printEui(identifier, EUI_PRINT_IEEE)).toBe(
			"36-56-78-9A-BC-DE-F0-12",
		);
	});

	// Appendix A again: the 48-bit form is widened first, then flipped.
	test("widens an EUI-48 and then complements the U/L bit", () => {
		const identifier = euiToIpv6InterfaceIdentifier(
			parseEui48("34-56-78-9A-BC-DE"),
		);

		expect(printEui(identifier, EUI_PRINT_IEEE)).toBe(
			"36-56-78-FF-FE-9A-BC-DE",
		);
	});

	test("flips a locally administered address the other way", () => {
		const identifier = euiToIpv6InterfaceIdentifier(
			parseEui48("02-1A-2B-3C-4D-5E"),
		);

		expect(printEui(identifier, EUI_PRINT_IEEE)).toBe(
			"00-1A-2B-FF-FE-3C-4D-5E",
		);
	});

	test("round-trips back to the EUI-64 it came from", () => {
		const eui = parseEui64("34-56-78-9A-BC-DE-F0-12");
		const identifier = euiToIpv6InterfaceIdentifier(eui);

		expect(
			printEui(ipv6InterfaceIdentifierToEui64(identifier), EUI_PRINT_IEEE),
		).toBe("34-56-78-9A-BC-DE-F0-12");
	});

	// RFC 4291 §2.5.6's own example of a link-local address built from a MAC.
	test("builds the interface half of a link-local address", () => {
		const identifier = euiToIpv6InterfaceIdentifier(
			parseEui48("00-00-0C-00-52-13"),
		);

		expect(
			printIpv6Address({
				value: (0xfe80n << 112n) | identifier.value,
				bitWidth: 128,
			}),
		).toBe("fe80::200:cff:fe00:5213");
	});
});
