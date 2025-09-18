import { expect, suite, test } from "vitest";
import { delay } from "./delay.js";

suite("delay", () => {
	test("should delay the execution of a callback function", async () => {
		const start = Date.now();
		const result = await delay(50, (x: number, y: number) => x + y, 2, 3);
		const duration = Date.now() - start + 1; // +1 to account for sub-milliseconds rounding errors

		expect(result).toBe(5);
		expect(duration).toBeGreaterThanOrEqual(50);
	});

	test("should work with no arguments", async () => {
		const start = Date.now();
		const result = await delay(50, () => "done");
		const duration = Date.now() - start + 1; // +1 to account for sub-milliseconds rounding errors

		expect(result).toBe("done");
		expect(duration).toBeGreaterThanOrEqual(50);
	});
});
