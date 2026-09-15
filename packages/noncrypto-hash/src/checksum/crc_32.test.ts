import { describe, expect, it } from "vitest";

import { CRC32C, CRC32_ISO_HDLC, crc_32 } from "./crc_32.js";

// Every named CRC in the RevEng catalogue publishes a "check" value: the CRC
// of the ASCII string "123456789". https://reveng.sourceforge.io/crc-catalogue/all.htm
const CHECK = new TextEncoder().encode("123456789");

describe("crc_32", () => {
	it("matches the CRC-32/ISO-HDLC check value by default", () => {
		expect(crc_32(CHECK)).toBe(0xcbf43926);
	});

	it("matches the CRC-32/ISO-HDLC check value explicitly", () => {
		expect(crc_32(CHECK, { preset: CRC32_ISO_HDLC })).toBe(0xcbf43926);
	});

	it("matches the CRC-32C (Castagnoli/ISCSI) check value", () => {
		expect(crc_32(CHECK, { preset: CRC32C })).toBe(0xe3069283);
	});

	it("returns 0 for empty input under CRC-32/ISO-HDLC", () => {
		expect(crc_32(new Uint8Array(0))).toBe(0);
	});
});
