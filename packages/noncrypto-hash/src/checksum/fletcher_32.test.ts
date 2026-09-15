import { describe, expect, it } from "vitest";

import { fletcher_32 } from "./fletcher_32.js";

// https://en.wikipedia.org/wiki/Fletcher%27s_checksum#Test_vectors
describe("fletcher_32", () => {
	it("is 0 for empty input", () => {
		expect(fletcher_32(new Uint8Array(0))).toBe(0);
	});

	it("matches the published 'abcde' checksum", () => {
		expect(fletcher_32(new TextEncoder().encode("abcde"))).toBe(0xf04fc729);
	});

	it("matches the published 'abcdef' checksum", () => {
		expect(fletcher_32(new TextEncoder().encode("abcdef"))).toBe(0x56502d2a);
	});

	it("matches the published 'abcdefgh' checksum", () => {
		expect(fletcher_32(new TextEncoder().encode("abcdefgh"))).toBe(0xebe19591);
	});
});
