import { expect, suite, test } from "vitest";

import {
	classifyIpv4Address,
	isIpv4SpecialPurpose,
} from "./ipv4/classify-ipv4.js";
import {
	parseInetAtonIpv4Address,
	tryParseIpv4Address,
} from "./ipv4/parse-ipv4.js";
import { printIpv4Address } from "./ipv4/print-ipv4.js";
import { classifyIpv6Address } from "./ipv6/classify-ipv6.js";
import { ipv4FromIpv6 } from "./ipv6/ipv4-mapped.js";
import { parseIpv6Address, tryParseIpv6Address } from "./ipv6/parse-ipv6.js";
import { parseEndpoint, tryParseEndpoint } from "./port/endpoint.js";

/**
 * The strings an SSRF allowlist is bypassed with.
 *
 * Every one of them names a blocked address to some parser somewhere, while
 * failing a naive string test for `127.` or `localhost`. Each is asserted
 * twice: that the strict parser refuses it outright, and — where the form is a
 * real address — that classification still reports the block it belongs to.
 */
suite("SSRF bypass vectors", () => {
	test.each(["0177.0.0.1", "2130706433", "0x7f.0.0.1", "127.1"])(
		"the strict IPv4 parser rejects the legacy form %o",
		(text) => {
			expect(tryParseIpv4Address(text)).toBeNull();
		},
	);

	test.each([
		["0177.0.0.1", "127.0.0.1"],
		["2130706433", "127.0.0.1"],
		["0x7f.0.0.1", "127.0.0.1"],
		["127.1", "127.0.0.1"],
	])(
		"the opt-in legacy parser reads %o as %o, and it classifies as loopback",
		(text, expected) => {
			const address = parseInetAtonIpv4Address(text);

			expect(printIpv4Address(address)).toBe(expected);
			expect(classifyIpv4Address(address)).toBe("loopback");
		},
	);

	test("`::ffff:127.0.0.1` is loopback once the mapped address is unwrapped", () => {
		const address = parseIpv6Address("::ffff:127.0.0.1");
		const embedded = ipv4FromIpv6(address);

		expect(classifyIpv6Address(address)).toBe("ipv4-mapped");
		expect(embedded).not.toBeNull();

		if (embedded !== null) {
			expect(classifyIpv4Address(embedded)).toBe("loopback");
			expect(isIpv4SpecialPurpose(embedded)).toBe(true);
		}
	});

	test("`[::1]` parses as an address, not as a host name", () => {
		const endpoint = parseEndpoint("[::1]");

		expect(endpoint.host.kind).toBe("ipv6");

		if (endpoint.host.kind === "ipv6") {
			expect(classifyIpv6Address(endpoint.host.address)).toBe("loopback");
		}
	});

	test("`100.64.0.1` is carrier-grade NAT space, not a global address", () => {
		const address = tryParseIpv4Address("100.64.0.1");

		expect(address).not.toBeNull();

		if (address !== null) {
			expect(classifyIpv4Address(address)).toBe("shared");
			expect(isIpv4SpecialPurpose(address)).toBe(true);
		}
	});

	test("`169.254.169.254` — the cloud metadata address — is link-local", () => {
		const address = tryParseIpv4Address("169.254.169.254");

		expect(address).not.toBeNull();

		if (address !== null) {
			expect(classifyIpv4Address(address)).toBe("link-local");
			expect(isIpv4SpecialPurpose(address)).toBe(true);
		}
	});

	test("an unbracketed IPv6 literal is never quietly split at a colon", () => {
		expect(tryParseEndpoint("::1:80")).toBeNull();
		expect(tryParseEndpoint("fe80::1%eth0:80")).toBeNull();
	});

	test("an embedded IPv4 part inside an IPv6 literal is parsed strictly too", () => {
		expect(tryParseIpv6Address("::ffff:0177.0.0.1")).toBeNull();
		expect(tryParseIpv6Address("::ffff:127.1")).toBeNull();
	});
});
