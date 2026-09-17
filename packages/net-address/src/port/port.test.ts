import { expect, suite, test } from "vitest";

import { printIpv4Address } from "../ipv4/print-ipv4.js";
import { printIpv6Address } from "../ipv6/print-ipv6.js";
import { parseEndpoint, printEndpoint, tryParseEndpoint } from "./endpoint.js";
import {
	EPHEMERAL_PORT_MAX_VALUE,
	EPHEMERAL_PORT_MIN_VALUE,
	getRandomEphemeralPort,
	isEphemeralPort,
} from "./ephemeral-port.js";
import {
	classifyPort,
	isDynamicPort,
	isPortNumber,
	isRegisteredPort,
	isWellKnownPort,
	parsePort,
	PORT_MAX_VALUE,
	toPortNumber,
	tryParsePort,
} from "./port.js";

suite("port numbers", () => {
	test("accepts the whole 16-bit range and nothing outside it", () => {
		expect(isPortNumber(0)).toBe(true);
		expect(isPortNumber(PORT_MAX_VALUE)).toBe(true);
		expect(isPortNumber(65_536)).toBe(false);
		expect(isPortNumber(-1)).toBe(false);
		expect(isPortNumber(80.5)).toBe(false);
		expect(() => toPortNumber(65_536)).toThrow(RangeError);
	});

	test("parses strictly, rejecting a leading zero", () => {
		expect(parsePort("443")).toBe(443);
		expect(parsePort("0")).toBe(0);
		expect(tryParsePort("080")).toBeNull();
		expect(tryParsePort("+80")).toBeNull();
		expect(tryParsePort("80 ")).toBeNull();
		expect(tryParsePort("65536")).toBeNull();
		expect(tryParsePort("")).toBeNull();
		expect(() => parsePort("080")).toThrow(SyntaxError);
	});

	test("classifies the RFC 6335 ranges", () => {
		expect(classifyPort(toPortNumber(0))).toBe("system");
		expect(classifyPort(toPortNumber(443))).toBe("system");
		expect(classifyPort(toPortNumber(1023))).toBe("system");
		expect(classifyPort(toPortNumber(1024))).toBe("user");
		expect(classifyPort(toPortNumber(49_151))).toBe("user");
		expect(classifyPort(toPortNumber(49_152))).toBe("dynamic");
		expect(classifyPort(toPortNumber(65_535))).toBe("dynamic");

		expect(isWellKnownPort(toPortNumber(80))).toBe(true);
		expect(isRegisteredPort(toPortNumber(8080))).toBe(true);
		expect(isDynamicPort(toPortNumber(50_000))).toBe(true);
	});
});

suite("getRandomEphemeralPort", () => {
	test("stays inside the IANA dynamic range", () => {
		for (let draw = 0; draw < 1000; draw++) {
			const port = getRandomEphemeralPort();

			expect(port).toBeGreaterThanOrEqual(EPHEMERAL_PORT_MIN_VALUE);
			expect(port).toBeLessThanOrEqual(EPHEMERAL_PORT_MAX_VALUE);
			expect(Number.isInteger(port)).toBe(true);
		}
	});

	test("agrees with the range predicate", () => {
		expect(isEphemeralPort(toPortNumber(49_152))).toBe(true);
		expect(isEphemeralPort(toPortNumber(49_151))).toBe(false);
		expect(isEphemeralPort(getRandomEphemeralPort())).toBe(true);
	});
});

suite("endpoints", () => {
	test("reads a host with no port", () => {
		const endpoint = parseEndpoint("example.org");

		expect(endpoint.host).toEqual({ kind: "name", name: "example.org" });
		expect(endpoint.port).toBeNull();
		expect(printEndpoint(endpoint)).toBe("example.org");
	});

	test("reads an IPv4 host and port", () => {
		const endpoint = parseEndpoint("10.0.0.1:8080");

		expect(endpoint.host.kind).toBe("ipv4");
		expect(endpoint.port).toBe(8080);
		expect(printEndpoint(endpoint)).toBe("10.0.0.1:8080");
	});

	test("reads the RFC 3986 §3.2.2 bracket form", () => {
		const endpoint = parseEndpoint("[::1]:8080");

		expect(endpoint.host.kind).toBe("ipv6");
		expect(endpoint.port).toBe(8080);
		expect(printEndpoint(endpoint)).toBe("[::1]:8080");
	});

	test("brackets an IPv6 host even without a port, so a port can be appended", () => {
		expect(printEndpoint(parseEndpoint("[2001:db8::1]"))).toBe("[2001:db8::1]");
	});

	test("carries a zone through the bracket form", () => {
		const endpoint = parseEndpoint("[fe80::1%eth0]:53");

		expect(endpoint.host).toMatchObject({ kind: "ipv6", zoneId: "eth0" });
		expect(printEndpoint(endpoint)).toBe("[fe80::1%eth0]:53");
	});

	test("refuses an unbracketed IPv6 literal, which is ambiguous with a port", () => {
		expect(tryParseEndpoint("::1:8080")).toBeNull();
		expect(tryParseEndpoint("2001:db8::1")).toBeNull();
	});

	test.each([
		"[::1",
		"[::1]8080",
		"[::1]:",
		"[not-an-address]",
		"host:",
		"host:080",
	])("rejects %o", (text) => {
		expect(tryParseEndpoint(text)).toBeNull();
	});

	test("leaves an all-digit host a name, because only a resolver can say more", () => {
		const endpoint = parseEndpoint("2130706433:80");

		expect(endpoint.host).toEqual({ kind: "name", name: "2130706433" });
	});

	test("classifies a bracketed literal as an address a guard can check", () => {
		const endpoint = parseEndpoint("[::ffff:127.0.0.1]:80");

		expect(endpoint.host.kind).toBe("ipv6");

		if (endpoint.host.kind === "ipv6") {
			expect(printIpv6Address(endpoint.host.address)).toBe("::ffff:127.0.0.1");
		}
	});

	test("keeps an IPv4 host an address", () => {
		const endpoint = parseEndpoint("169.254.169.254:80");

		if (endpoint.host.kind === "ipv4") {
			expect(printIpv4Address(endpoint.host.address)).toBe("169.254.169.254");
		} else {
			expect.unreachable("an IPv4 literal must not read as a name");
		}
	});
});
