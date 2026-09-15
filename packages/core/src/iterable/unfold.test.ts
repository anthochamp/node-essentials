import { describe, expect, it } from "vitest";

import { range } from "./range.js";
import { take } from "./take.js";
import { unfold } from "./unfold.js";

describe("unfold", () => {
	it("should generate until the step function stops", () => {
		expect([
			...unfold(1, (value) => (value <= 4 ? [value, value + 1] : undefined)),
		]).toEqual([1, 2, 3, 4]);
	});

	it("should yield nothing when the first step declines", () => {
		expect([...unfold(0, () => undefined)]).toEqual([]);
	});

	it("should carry state distinct from the yielded value", () => {
		expect([
			...unfold({ n: 0 }, (state) =>
				state.n < 3 ? [`#${state.n}`, { n: state.n + 1 }] : undefined,
			),
		]).toEqual(["#0", "#1", "#2"]);
	});

	it("should reproduce range", () => {
		expect([
			...unfold(0, (value) => (value < 5 ? [value, value + 1] : undefined)),
		]).toEqual([...range(0, 5)]);
	});

	it("should generate forever when the step never declines", () => {
		expect([
			...take(
				unfold(1, (value) => [value, value * 2]),
				5,
			),
		]).toEqual([1, 2, 4, 8, 16]);
	});

	it("should be lazy", () => {
		let calls = 0;
		const iterator = unfold(0, (value) => {
			calls++;
			return [value, value + 1];
		});

		expect(calls).toBe(0);

		iterator.next();

		expect(calls).toBe(1);
	});
});
