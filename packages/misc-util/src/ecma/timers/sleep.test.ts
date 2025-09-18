import { expect, suite, test } from "vitest";
import { sleep } from "./sleep.js";

suite("sleep", () => {
	test("should sleep for the specified duration", async () => {
		const start = Date.now();
		await sleep(100);
		const duration = Date.now() - start + 1; // +1 to account for sub-milliseconds rounding errors
		expect(duration).toBeGreaterThanOrEqual(100);
	});
});
