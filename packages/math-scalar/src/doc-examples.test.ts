import { describe, expect, it } from "vitest";

import { lerp } from "./lerp.js";
import { linspace } from "./linspace.js";
import { pingpongStep } from "./pingpong-step.js";

// Every value published in an `@example` block, pinned. A number printed in the
// documentation is a claim; this is what keeps it honest.
describe("documented examples", () => {
	it("lerp", () => {
		expect(lerp(0, 100, 0.25)).toBe(25);
		expect(lerp(10, 20, 1.5)).toBe(25);
	});

	it("linspace", () => {
		expect(linspace(0, 1, 5)).toStrictEqual([0, 0.25, 0.5, 0.75, 1]);
		expect(linspace(0, 1, 5).at(-1)).toBe(1);
	});

	it("pingpongStep", () => {
		const bounced = pingpongStep(8, 3, 10);
		expect(bounced).toStrictEqual({ value: 10, direction: -1 });
		expect(
			pingpongStep(bounced.value, 3 * bounced.direction, 10),
		).toStrictEqual({ value: 7, direction: -1 });
	});
});
