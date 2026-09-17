import { UnsupportedError } from "@ac-kit/core";
import { describe, expect, it } from "vitest";

import { toInetAddress } from "./inet-address.js";

describe("inet", () => {
	describe("toInetAddress", () => {
		describe("with string family", () => {
			it("should handle IPv4 string", () => {
				const result = toInetAddress("IPv4", "192.168.1.1");
				expect(result.family).toBe(4);
				expect(result.address).toBe("192.168.1.1");
			});

			it("should handle IPv6 string", () => {
				const result = toInetAddress("IPv6", "::1");
				expect(result.family).toBe(6);
				expect(result.address).toBe("::1");
			});

			it("should throw on invalid string family", () => {
				expect(() => toInetAddress("IPv5", "192.168.1.1")).toThrow(
					UnsupportedError,
				);
				expect(() => toInetAddress("IPv5", "192.168.1.1")).toThrow(
					/Unsupported IP family: IPv5/,
				);
			});

			it("should throw on empty string family", () => {
				expect(() => toInetAddress("", "192.168.1.1")).toThrow(
					UnsupportedError,
				);
			});
		});

		describe("with number family", () => {
			it("should handle numeric 4 (IPv4)", () => {
				const result = toInetAddress(4, "10.0.0.1");
				expect(result.family).toBe(4);
				expect(result.address).toBe("10.0.0.1");
			});

			it("should handle numeric 6 (IPv6)", () => {
				const result = toInetAddress(6, "fe80::1");
				expect(result.family).toBe(6);
				expect(result.address).toBe("fe80::1");
			});

			it("should throw on invalid numeric family", () => {
				expect(() => toInetAddress(5, "192.168.1.1")).toThrow(UnsupportedError);
				expect(() => toInetAddress(5, "192.168.1.1")).toThrow(
					/Unsupported IP family: 5/,
				);
			});

			it("should throw on negative family", () => {
				expect(() => toInetAddress(-1, "192.168.1.1")).toThrow(
					UnsupportedError,
				);
			});

			it("should throw on zero family", () => {
				expect(() => toInetAddress(0, "192.168.1.1")).toThrow(UnsupportedError);
			});
		});

		describe("with null family", () => {
			it("should handle null family", () => {
				const result = toInetAddress(null, "192.168.1.1");
				expect(result.family).toBeNull();
				expect(result.address).toBe("192.168.1.1");
			});

			it("should preserve address with null family", () => {
				const result = toInetAddress(null, "2001:db8::1");
				expect(result.family).toBeNull();
				expect(result.address).toBe("2001:db8::1");
			});
		});

		describe("address handling", () => {
			it("should preserve IPv4 address format", () => {
				const addresses = [
					"0.0.0.0",
					"127.0.0.1",
					"192.168.1.1",
					"255.255.255.255",
				];

				for (const addr of addresses) {
					const result = toInetAddress(4, addr);
					expect(result.address).toBe(addr);
				}
			});

			it("should preserve IPv6 address format", () => {
				const addresses = [
					"::1",
					"::",
					"fe80::1",
					"2001:db8::1",
					"2001:0db8:0000:0000:0000:ff00:0042:8329",
				];

				for (const addr of addresses) {
					const result = toInetAddress(6, addr);
					expect(result.address).toBe(addr);
				}
			});

			it("should handle empty address string", () => {
				const result = toInetAddress(4, "");
				expect(result.address).toBe("");
			});
		});

		describe("type validation", () => {
			it("should return correct type structure", () => {
				const result = toInetAddress(4, "192.168.1.1");
				expect(result).toHaveProperty("family");
				expect(result).toHaveProperty("address");
				expect(Object.keys(result)).toHaveLength(2);
			});

			it("should return InetAddress with all family types", () => {
				const ipv4 = toInetAddress(4, "192.168.1.1");
				expect(ipv4.family).toBe(4);

				const ipv6 = toInetAddress(6, "::1");
				expect(ipv6.family).toBe(6);

				const unknown = toInetAddress(null, "192.168.1.1");
				expect(unknown.family).toBeNull();
			});
		});

		describe("error messages", () => {
			it("should provide clear error for invalid string family", () => {
				expect(() => toInetAddress("IPv5", "192.168.1.1")).toThrow(
					"Unsupported IP family: IPv5. Expected 'IPv4' or 'IPv6'.",
				);
			});

			it("should provide clear error for invalid numeric family", () => {
				expect(() => toInetAddress(5, "192.168.1.1")).toThrow(
					"Unsupported IP family: 5. Expected 4 (IPv4) or 6 (IPv6).",
				);
			});
		});
	});
});
