import { describe, expect, it } from "vitest";

import { quaternionEquals, quaternionIsClose } from "./quaternion.js";

describe("quaternionEquals", () => {
	it("is exact and compares components, so q and -q differ", () => {
		expect(quaternionEquals([0, 0, 0, 1], [0, 0, 0, 1])).toBe(true);
		expect(quaternionEquals([0, 0, 0, 1], [-0, -0, -0, -1])).toBe(false);
	});

	it("has a tolerant companion that agrees on the same distinction", () => {
		expect(
			quaternionIsClose([0, 0, 0, 1], [0, 0, 0, 1 - 1e-12], { absTol: 1e-9 }),
		).toBe(true);
		expect(
			quaternionIsClose([0, 0, 0, 1], [0, 0, 0, -1], { absTol: 1e-9 }),
		).toBe(false);
	});
});
