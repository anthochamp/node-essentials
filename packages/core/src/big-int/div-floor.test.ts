import { describe, expect, it } from "vitest";

import { bigIntDivFloor } from "./div-floor.js";

describe("division", () => {
	it("floors toward negative infinity", () => {
		expect(bigIntDivFloor(-7n, 2n)).toBe(-4n);
		expect(bigIntDivFloor(7n, -2n)).toBe(-4n);
		expect(bigIntDivFloor(7n, 2n)).toBe(3n);
	});
});
