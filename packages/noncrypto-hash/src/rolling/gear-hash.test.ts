import { MASK_64N } from "@ac-kit/core";
import { describe, expect, it } from "vitest";

import { GearHash } from "./gear-hash.js";

describe("GearHash", () => {
	it("starts at value 0n before any push", () => {
		expect(new GearHash().value).toBe(0n);
	});

	it("returns the updated value from push", () => {
		const gear = new GearHash();

		expect(gear.push(0x61)).toBe(gear.value);
	});

	// hash = (hash << 1) + table[byteIn]; starting from 0, a single push of
	// byte 0 must equal the table's own first entry (this package's own
	// frozen table, see gear-hash.ts's module doc comment).
	it("matches the table's first entry after a single push of byte 0", () => {
		const gear = new GearHash();

		expect(gear.push(0x00)).toBe(0x41aab1e69572b9c6n);
	});

	// Hand-derived from the same two table entries: (table[0] << 1 +
	// table[1]) mod 2^64.
	it("matches a hand-derived value after pushing bytes 0 then 1", () => {
		const gear = new GearHash();

		gear.push(0x00);

		expect(gear.push(0x01)).toBe(0xce773483eeb7776fn);
	});

	it("keeps value within the unsigned 64-bit range over many pushes", () => {
		const gear = new GearHash();

		for (let i = 0; i < 1000; i++) {
			gear.push(i & 0xff);
			expect(gear.value).toBeGreaterThanOrEqual(0n);
			expect(gear.value).toBeLessThanOrEqual(MASK_64N);
		}
	});
});
