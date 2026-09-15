import { describe, expect, it } from "vitest";

import {
	CRC16_CCITT_FALSE,
	CRC16_KERMIT,
	CRC16_MODBUS,
	CRC16_USB,
	CRC16_XMODEM,
	crc_16,
} from "./crc_16.js";

// https://reveng.sourceforge.io/crc-catalogue/all.htm
const CHECK = new TextEncoder().encode("123456789");

describe("crc_16", () => {
	it("matches the CRC-16/CCITT-FALSE check value by default", () => {
		expect(crc_16(CHECK)).toBe(0x29b1);
	});

	it("matches the CRC-16/CCITT-FALSE check value explicitly", () => {
		expect(crc_16(CHECK, { preset: CRC16_CCITT_FALSE })).toBe(0x29b1);
	});

	it("matches the CRC-16/XMODEM check value (non-reflected)", () => {
		expect(crc_16(CHECK, { preset: CRC16_XMODEM })).toBe(0x31c3);
	});

	it("matches the CRC-16/MODBUS check value", () => {
		expect(crc_16(CHECK, { preset: CRC16_MODBUS })).toBe(0x4b37);
	});

	it("matches the CRC-16/USB check value", () => {
		expect(crc_16(CHECK, { preset: CRC16_USB })).toBe(0xb4c8);
	});

	it("matches the CRC-16/KERMIT check value (reflected)", () => {
		expect(crc_16(CHECK, { preset: CRC16_KERMIT })).toBe(0x2189);
	});
});
