import { describe, expect, it } from "vitest";

import {
	CRC8,
	CRC8_CCITT,
	CRC8_MAXIM,
	CRC8_SAE_J1850,
	crc_8,
} from "./crc_8.js";

// https://reveng.sourceforge.io/crc-catalogue/all.htm
const CHECK = new TextEncoder().encode("123456789");

describe("crc_8", () => {
	it("matches the CRC-8/SMBUS check value by default", () => {
		expect(crc_8(CHECK)).toBe(0xf4);
	});

	it("matches the CRC-8/SMBUS check value explicitly", () => {
		expect(crc_8(CHECK, { preset: CRC8 })).toBe(0xf4);
	});

	it("matches the CRC-8/SAE-J1850 check value", () => {
		expect(crc_8(CHECK, { preset: CRC8_SAE_J1850 })).toBe(0x4b);
	});

	it("matches the CRC-8/MAXIM-DOW check value (reflected)", () => {
		expect(crc_8(CHECK, { preset: CRC8_MAXIM })).toBe(0xa1);
	});

	it("matches the CRC-8/I-432-1 (ITU) check value", () => {
		expect(crc_8(CHECK, { preset: CRC8_CCITT })).toBe(0xa1);
	});
});
