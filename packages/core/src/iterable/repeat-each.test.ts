import { describe, expect, it } from "vitest";

import { cycle } from "./cycle.js";
import { repeatEach } from "./repeat-each.js";

describe("repeatEach", () => {
	it("should repeat each element consecutively", () => {
		expect([...repeatEach([1, 2], 3)]).toEqual([1, 1, 1, 2, 2, 2]);
	});

	it("should leave the sequence unchanged at a count of one", () => {
		expect([...repeatEach([1, 2, 3], 1)]).toEqual([1, 2, 3]);
	});

	it("should yield nothing at a count of zero", () => {
		expect([...repeatEach([1, 2], 0)]).toEqual([]);
	});

	it("should yield nothing for an empty iterable", () => {
		expect([...repeatEach([], 3)]).toEqual([]);
	});

	it("should differ from cycle, which repeats the whole sequence", () => {
		expect([...repeatEach([1, 2], 2)]).toEqual([1, 1, 2, 2]);
		expect([...cycle([1, 2], 2)]).toEqual([1, 2, 1, 2]);
	});

	it("should buffer nothing", () => {
		let produced = 0;
		function* counted(): IterableIterator<number> {
			while (true) {
				produced++;
				yield produced;
			}
		}

		repeatEach(counted(), 3).next();

		expect(produced).toBe(1);
	});

	it("should reject a negative or fractional count", () => {
		expect(() => [...repeatEach([1], -1)]).toThrow(RangeError);
		expect(() => [...repeatEach([1], 1.5)]).toThrow(RangeError);
	});
});
