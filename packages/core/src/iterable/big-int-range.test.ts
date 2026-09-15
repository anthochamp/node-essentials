import { describe, expect, it } from "vitest";

import { bigIntRange } from "./big-int-range.js";
import { range } from "./range.js";

describe("bigIntRange", () => {
	it("should count up to an exclusive bound", () => {
		expect([...bigIntRange(0n, 5n)]).toEqual([0n, 1n, 2n, 3n, 4n]);
	});

	it("should count down with a negative step", () => {
		expect([...bigIntRange(5n, 0n, -1n)]).toEqual([5n, 4n, 3n, 2n, 1n]);
	});

	it("should honour a step larger than one", () => {
		expect([...bigIntRange(0n, 10n, 3n)]).toEqual([0n, 3n, 6n, 9n]);
	});

	it("should yield nothing when the bound is already passed", () => {
		expect([...bigIntRange(5n, 0n)]).toEqual([]);
		expect([...bigIntRange(0n, 5n, -1n)]).toEqual([]);
		expect([...bigIntRange(3n, 3n)]).toEqual([]);
	});

	it("should agree with range over safe integers", () => {
		expect([...bigIntRange(0n, 10n, 2n)].map(Number)).toEqual([
			...range(0, 10, 2),
		]);
	});

	it("should stay exact beyond Number.MAX_SAFE_INTEGER", () => {
		const start = BigInt(Number.MAX_SAFE_INTEGER);

		expect([...bigIntRange(start, start + 3n)]).toEqual([
			start,
			start + 1n,
			start + 2n,
		]);
	});

	it("should reject a zero step", () => {
		expect(() => [...bigIntRange(0n, 5n, 0n)]).toThrow(RangeError);
	});
});
