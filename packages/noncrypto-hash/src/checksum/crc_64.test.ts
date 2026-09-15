import { describe, expect, it } from "vitest";

import { CRC64_ISO, CRC64_XZ, crc_64 } from "./crc_64.js";

// https://reveng.sourceforge.io/crc-catalogue/all.htm
const CHECK = new TextEncoder().encode("123456789");

describe("crc_64", () => {
	it("matches the CRC-64/XZ check value by default", () => {
		expect(crc_64(CHECK)).toBe(0x995dc9bbdf1939fan);
	});

	it("matches the CRC-64/XZ check value explicitly", () => {
		expect(crc_64(CHECK, { preset: CRC64_XZ })).toBe(0x995dc9bbdf1939fan);
	});

	it("matches the CRC-64/GO-ISO check value", () => {
		expect(crc_64(CHECK, { preset: CRC64_ISO })).toBe(0xb90956c775a41001n);
	});

	it("returns 0n for empty input under CRC-64/XZ", () => {
		expect(crc_64(new Uint8Array(0))).toBe(0n);
	});
});
