import { describe, expect, it } from "vitest";

import { fletcher_16 } from "./fletcher_16.js";

// https://en.wikipedia.org/wiki/Fletcher%27s_checksum#Test_vectors
describe("fletcher_16", () => {
	it("is 0 for empty input", () => {
		expect(fletcher_16(new Uint8Array(0))).toBe(0);
	});

	it("matches the published 'abcde' checksum", () => {
		expect(fletcher_16(new TextEncoder().encode("abcde"))).toBe(0xc8f0);
	});

	it("matches the published 'abcdef' checksum", () => {
		expect(fletcher_16(new TextEncoder().encode("abcdef"))).toBe(0x2057);
	});

	it("matches the published 'abcdefgh' checksum", () => {
		expect(fletcher_16(new TextEncoder().encode("abcdefgh"))).toBe(0x0627);
	});
});
